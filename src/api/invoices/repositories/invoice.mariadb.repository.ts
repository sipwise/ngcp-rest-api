import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {InvoiceSearchDto} from '~/api/invoices/dto/invoice-search.dto'
import {
    InvoiceCallRow,
    InvoiceCallSide,
    InvoiceCdrContractType,
    InvoiceCdrQuery,
    InvoiceContract,
    InvoiceDidZoneRow,
    InvoiceZoneRow,
} from '~/api/invoices/interfaces/invoice-data.interface'
import {InvoiceRepository} from '~/api/invoices/interfaces/invoice.repository'
import {db, internal} from '~/entities'
import {InvoiceTemplateCallDirection} from '~/entities/internal/invoice-template.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {
    CallListSuppression,
    CallListSuppressionDirection,
    CallListSuppressionMode,
    callListSuppressionSubquery,
} from '~/helpers/call-list-suppression.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    resellerId?: number
}

type Row = Record<string, unknown>

const otherSide = (side: InvoiceCallSide): InvoiceCallSide =>
    side == InvoiceCallSide.Source ? InvoiceCallSide.Destination : InvoiceCallSide.Source

// in: the contract is the destination of the calls, out: the source
const callSides: Record<InvoiceTemplateCallDirection, InvoiceCallSide[]> = {
    [InvoiceTemplateCallDirection.In]: [InvoiceCallSide.Destination],
    [InvoiceTemplateCallDirection.Out]: [InvoiceCallSide.Source],
    [InvoiceTemplateCallDirection.InOut]: [InvoiceCallSide.Destination, InvoiceCallSide.Source],
}

const epoch = (date: Date): number => Math.floor(date.getTime() / 1000)

const toNumber = (value: unknown): number => Number(value ?? 0) || 0

const toZoneRow = (row: Row): InvoiceZoneRow => ({
    zone: row.zone as string | null,
    zoneDetail: row.zone_detail as string | null,
    customerCost: toNumber(row.customercost),
    resellerCost: toNumber(row.resellercost),
    carrierCost: toNumber(row.carriercost),
    freeTime: toNumber(row.free_time),
    duration: toNumber(row.duration),
    number: toNumber(row.number),
})

/**
 * Zone aggregate of the calls of one side of the contract, as v1 get_contract_zonesfees_rs: the costs and the
 * zone of the cost category, no calls within the contract; did: grouped by the subscribers of the contract
 */
function zoneQuery(q: InvoiceCdrQuery, side: InvoiceCallSide, did: boolean): [string, unknown[]] {
    const other = otherSide(side)
    const category = q.costCategory
    const contractId = q.contractType == InvoiceCdrContractType.Provider ? String(q.contractId) : q.contractId
    const contractCondition = did
        ? `vs.contract_id = ? AND cdr.${other}_account_id != ?`
        : `cdr.${side}_${q.contractType}_id = ? AND cdr.${other}_${q.contractType}_id != ?`
    const sql = `SELECT ${did ? 'vs.id AS subscriber_id, ' : ''}bzh.zone AS zone, bzh.detail AS zone_detail,
            SUM(cdr.${side}_customer_cost) AS customercost,
            SUM(cdr.${side}_reseller_cost) AS resellercost,
            SUM(cdr.${side}_carrier_cost) AS carriercost,
            SUM(cdr.${side}_${category}_free_time) AS free_time,
            SUM(cdr.duration) AS duration,
            COUNT(*) AS number
        FROM accounting.cdr cdr
        ${did ? `JOIN billing.voip_subscribers vs ON vs.uuid = cdr.${side}_user_id` : ''}
        LEFT JOIN billing.billing_zones_history bzh ON bzh.id = cdr.${side}_${category}_billing_zone_id
        WHERE cdr.call_status = 'ok' AND cdr.start_time >= ? AND cdr.start_time <= ?
            AND ${contractCondition}
        GROUP BY ${did ? 'vs.id, ' : ''}bzh.zone, bzh.detail
        ORDER BY ${did ? 'vs.id, ' : ''}bzh.zone, bzh.detail`
    return [sql, [epoch(q.start), epoch(q.end), contractId, contractId]]
}

/**
 * Calls of one side of the contract, as v1 get_contract_calls_rs, with the zone of that side and the id of
 * the matching call list suppression; without shown suppressions, filtered calls are left out
 */
function callQuery(q: InvoiceCdrQuery, side: InvoiceCallSide, showSuppressions: boolean): [string, unknown[]] {
    const category = q.costCategory
    const contractId = q.contractType == InvoiceCdrContractType.Provider ? String(q.contractId) : q.contractId
    const direction = side == InvoiceCallSide.Source
        ? CallListSuppressionDirection.Outgoing
        : CallListSuppressionDirection.Incoming
    const modes = showSuppressions
        ? [CallListSuppressionMode.Filter, CallListSuppressionMode.Obfuscate]
        : [CallListSuppressionMode.Obfuscate]
    const filter = showSuppressions
        ? ''
        : `AND NOT EXISTS (${callListSuppressionSubquery(direction, [CallListSuppressionMode.Filter])})`
    // in_out lists a call within the contract once, as outgoing call
    const intraCondition = q.callDirection == InvoiceTemplateCallDirection.InOut && side == InvoiceCallSide.Destination
        ? `AND cdr.${otherSide(side)}_${q.contractType}_id != ?`
        : ''
    const sql = `SELECT cdr.source_user, cdr.source_domain, cdr.source_cli, cdr.destination_user_in,
            cdr.start_time, cdr.duration, cdr.call_type, cdr.${side}_${category}_cost AS cost,
            bzh.zone AS zone, bzh.detail AS zone_detail,
            (${callListSuppressionSubquery(direction, modes)}) AS suppression_id
        FROM accounting.cdr cdr
        LEFT JOIN billing.billing_zones_history bzh ON bzh.id = cdr.${side}_${category}_billing_zone_id
        WHERE cdr.call_status = 'ok' AND cdr.start_time >= ? AND cdr.start_time <= ?
            AND cdr.${side}_${q.contractType}_id = ?
            ${intraCondition}
            ${filter}
        ORDER BY cdr.start_time`
    return [sql, [epoch(q.start), epoch(q.end), contractId, ...(intraCondition ? [contractId] : [])]]
}

@Injectable()
export class InvoiceMariadbRepository extends MariaDbRepository implements InvoiceRepository {
    private readonly log = new LoggerService(InvoiceMariadbRepository.name)

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.Invoice[], number]> {
        const qb = await this.createSearchQueryBuilder(sr, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [result.map(d => d.toInternal()), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Invoice> {
        const qb = await this.createSearchQueryBuilder(sr, filterBy)
        qb.andWhere({id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Invoice[]> {
        const qb = await this.createSearchQueryBuilder(sr, filterBy)
        qb.andWhereInIds(ids)
        const result = await qb.getMany()
        return result.map(d => d.toInternal())
    }

    async readDataById(id: number, filterBy?: FilterBy): Promise<internal.Invoice> {
        const qb = db.billing.Invoice.createQueryBuilder('invoice')
        qb.addSelect('invoice.data')
        qb.innerJoin('invoice.contract', 'contract')
        qb.innerJoin('contract.contact', 'contact')
        qb.where({id: id})
        await this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async create(invoice: internal.Invoice): Promise<number> {
        const result = await db.billing.Invoice.insert(new db.billing.Invoice().fromInternal(invoice))
        return (result.identifiers[0] as {id: number}).id
    }

    async update(id: number, invoice: internal.Invoice): Promise<void> {
        await db.billing.Invoice.update(id, {serial: invoice.serial, data: invoice.data})
    }

    async readContract(contractId: number): Promise<InvoiceContract | undefined> {
        const contract = await db.billing.Contract.createQueryBuilder('contract')
            .innerJoinAndSelect('contract.product', 'product')
            .innerJoinAndSelect('contract.contact', 'contact')
            .leftJoinAndSelect('contact.reseller', 'reseller')
            .leftJoinAndSelect('reseller.contract', 'resellerContract')
            .leftJoinAndSelect('resellerContract.contact', 'resellerContact')
            .where('contract.id = :id', {id: contractId})
            .getOne()
        if (!contract)
            return undefined
        return {
            contract: contract.toInternal(),
            productClass: contract.product.class as ProductClass,
            contact: contract.contact.toInternal(),
            resellerContact: contract.contact.reseller?.contract?.contact?.toInternal(),
        }
    }

    async readZones(q: InvoiceCdrQuery): Promise<InvoiceZoneRow[]> {
        const rows: InvoiceZoneRow[] = []
        for (const side of callSides[q.callDirection]) {
            const [sql, params] = zoneQuery(q, side, false)
            const result: Row[] = await db.billing.Invoice.query(sql, params)
            rows.push(...result.map(toZoneRow))
        }
        return rows
    }

    async readDidZones(q: InvoiceCdrQuery): Promise<InvoiceDidZoneRow[]> {
        const rows: InvoiceDidZoneRow[] = []
        for (const side of callSides[q.callDirection]) {
            const [sql, params] = zoneQuery(q, side, true)
            const result: Row[] = await db.billing.Invoice.query(sql, params)
            rows.push(...result.map(row => ({...toZoneRow(row), subscriberId: toNumber(row.subscriber_id)})))
        }
        return rows.sort((a, b) => a.subscriberId - b.subscriberId)
    }

    async readCalls(q: InvoiceCdrQuery, showSuppressions: boolean): Promise<InvoiceCallRow[]> {
        const rows: InvoiceCallRow[] = []
        for (const side of callSides[q.callDirection]) {
            const [sql, params] = callQuery(q, side, showSuppressions)
            const result: Row[] = await db.billing.Invoice.query(sql, params)
            rows.push(...result.map(row => ({
                side: side,
                sourceUser: row.source_user as string,
                sourceDomain: row.source_domain as string,
                sourceCli: row.source_cli as string,
                destinationUserIn: row.destination_user_in as string,
                startTime: toNumber(row.start_time),
                duration: toNumber(row.duration),
                callType: row.call_type as string,
                cost: toNumber(row.cost),
                zone: row.zone as string | null,
                zoneDetail: row.zone_detail as string | null,
                suppressionId: row.suppression_id != null ? toNumber(row.suppression_id) : null,
            })))
        }
        return rows
    }

    async readCallListSuppressions(ids: number[]): Promise<CallListSuppression[]> {
        if (!ids.length)
            return []
        const result: Row[] = await db.billing.Invoice.query(
            'SELECT id, label, mode FROM billing.call_list_suppressions WHERE id IN (?)', [ids],
        )
        return result.map(row => ({
            id: toNumber(row.id),
            label: row.label as string,
            mode: row.mode as CallListSuppressionMode,
        }))
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.Invoice.delete(ids)
        return ids
    }

    private async createSearchQueryBuilder(sr: ServiceRequest, filterBy?: FilterBy): Promise<SelectQueryBuilder<db.billing.Invoice>> {
        const qb = db.billing.Invoice.createQueryBuilder('invoice')
        qb.innerJoin('invoice.contract', 'contract')
        qb.innerJoin('contract.contact', 'contact')
        const searchDto = new InvoiceSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        await this.addFilterBy(qb, filterBy)
        return qb
    }

    private async addFilterBy(qb: SelectQueryBuilder<db.billing.Invoice>, filterBy?: FilterBy): Promise<void> {
        if (filterBy?.resellerId)
            qb.andWhere('contact.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
    }
}
