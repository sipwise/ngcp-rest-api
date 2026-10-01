import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {InvoiceTemplateSearchDto} from '~/api/templates/invoices/dto/invoice-search.dto'
import {InvoiceTemplateRepository} from '~/api/templates/invoices/interfaces/invoice.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    resellerId?: number
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
        qb.andWhere({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
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
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readByResellerAndName(resellerId: number | null, name: string): Promise<internal.InvoiceTemplate | undefined> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('template')
        qb.where('template.name = :name', {name: name})
        if (resellerId)
            qb.andWhere('template.reseller_id = :resellerId', {resellerId: resellerId})
        else
            qb.andWhere('template.reseller_id IS NULL')
        const result = await qb.getOne()
        return result?.toInternal()
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

    private addFilterBy(qb: SelectQueryBuilder<db.billing.InvoiceTemplate>, filterBy?: FilterBy): void {
        if (filterBy?.resellerId)
            qb.andWhere('template.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
    }
}
