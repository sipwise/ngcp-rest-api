import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {InvoiceTemplateSearchDto} from '~/api/templates/invoices/dto/invoice-template-search.dto'
import {InvoiceTemplateRepository} from '~/api/templates/invoices/interfaces/invoice-template.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    resellerId?: number
    customerId?: number
}

@Injectable()
export class InvoiceTemplateMariadbRepository extends MariaDbRepository implements InvoiceTemplateRepository {
    private readonly log = new LoggerService(InvoiceTemplateMariadbRepository.name)

    async create(entities: internal.InvoiceTemplate[]): Promise<number[]> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('template')
        const values = await Promise.all(entities.map(async entity => new db.billing.InvoiceTemplate().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.InvoiceTemplate[], number]> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('template')
        qb.leftJoinAndSelect('template.reseller', 'bReseller')
        const searchDto  = new InvoiceTemplateSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.InvoiceTemplate> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('template')
        qb.leftJoinAndSelect('template.reseller', 'bReseller')
        const searchDto  = new InvoiceTemplateSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOne()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.InvoiceTemplate[]> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('template')
        qb.leftJoinAndSelect('template.reseller', 'bReseller')
        const searchDto  = new InvoiceTemplateSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('template')
        qb.leftJoinAndSelect('template.reseller', 'bReseller')
        const searchDto = new InvoiceTemplateSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.InvoiceTemplate>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.InvoiceTemplate.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.InvoiceTemplate.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.InvoiceTemplate.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.InvoiceTemplate>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('template.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
            if (filterBy.customerId) {
                qb.andWhere('bReseller.contract_id = :customerId', {customerId: filterBy.customerId})
            }
        }
    }
}
