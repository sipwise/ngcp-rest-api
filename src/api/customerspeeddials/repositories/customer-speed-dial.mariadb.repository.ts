import {Injectable, NotFoundException} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {CustomerSpeedDialSearchDto} from '~/api/customerspeeddials/dto/customer-speed-dial-search.dto'
import {CustomerSpeedDialRepository} from '~/api/customerspeeddials/interfaces/customer-speed-dial.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

interface SpeedDialOptions {
    isPilot: boolean
}

@Injectable()
export class CustomerSpeedDialMariadbRepository extends MariaDbRepository implements CustomerSpeedDialRepository {
    private readonly log = new LoggerService(CustomerSpeedDialMariadbRepository.name)

    async create(entities: internal.CustomerSpeedDial[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const values = entities.map(csd => new db.provisioning.VoipContractSpeedDial().fromInternal(csd))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const searchDto = new CustomerSpeedDialSearchDto()
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
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await mapYield(result, d => d.toInternal()), totalCount]
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const created = await qb.getMany()
        return await mapYield(created, (csd) => csd.toInternal())
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const searchDto = new CustomerSpeedDialSearchDto()
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
        qb.andWhere({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    async update(updates: Dictionary<internal.CustomerSpeedDial>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbCSD = db.provisioning.VoipContractSpeedDial.create()
            dbCSD.fromInternal(updates[id])
            await db.provisioning.VoipContractSpeedDial.update(id, dbCSD)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipContractSpeedDial.delete(ids)
        return ids
    }

    // reseller id of each customer of `customerIds` that exists
    async readCustomerResellerIds(customerIds: number[]): Promise<Map<number, number>> {
        if (!customerIds.length)
            return new Map()
        const rows = await db.billing.Contract.createQueryBuilder('contract')
            .leftJoin('contract.contact', 'contact')
            .select('contract.id', 'id')
            .addSelect('contact.reseller_id', 'resellerId')
            .where('contract.id IN (:...ids)', {ids: customerIds})
            .getRawMany<{id: number, resellerId: number}>()
        return new Map(rows.map(row => [row.id, row.resellerId]))
    }

    // domain of a (non-)pilot subscriber of each customer of `customerIds` that has one
    async readSubscriberDomains(customerIds: number[], options: SpeedDialOptions): Promise<Map<number, string>> {
        if (!customerIds.length)
            return new Map()
        const rows = await db.provisioning.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoin('subscriber.domain', 'domain')
            .select('subscriber.account_id', 'customerId')
            .addSelect('MIN(domain.domain)', 'domain')
            .where('subscriber.account_id IN (:...ids)', {ids: customerIds})
            .andWhere('subscriber.is_pbx_pilot = :isPilot', {isPilot: options.isPilot})
            .groupBy('subscriber.account_id')
            .getRawMany<{customerId: number, domain: string}>()
        return new Map(rows.map(row => [row.customerId, row.domain]))
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipContractSpeedDial>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.customerId) {
                qb.andWhere({contract_id: filterBy.customerId})
            }
            if (filterBy.resellerId) {
                qb.innerJoin('csd.contract', 'contract')
                qb.innerJoin('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
