import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {NCOSLevelSearchDto} from '~/api/ncos/levels/dto/ncos-level-search.dto'
import {NCOSLevelRepository} from '~/api/ncos/levels/interfaces/ncos-level.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

interface FilterBy {
    resellerId?: number
    exposeToCustomer?: boolean
}

@Injectable()
export class NCOSLevelMariadbRepository extends MariaDbRepository implements NCOSLevelRepository {
    private readonly log = new LoggerService(NCOSLevelMariadbRepository.name)

    async create(entities: internal.NCOSLevel[]): Promise<number[]> {
        const qb = db.billing.NCOSLevel.createQueryBuilder('ncosLevel')
        const values = await Promise.all(entities.map(async entity => new db.billing.NCOSLevel().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.NCOSLevel[], number]> {
        const qb = db.billing.NCOSLevel.createQueryBuilder('ncosLevel')
        const searchDto  = new NCOSLevelSearchDto()
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
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSLevel> {
        const qb = db.billing.NCOSLevel.createQueryBuilder('ncosLevel')
        const searchDto  = new NCOSLevelSearchDto()
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
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSLevel[]> {
        const qb = db.billing.NCOSLevel.createQueryBuilder('ncosLevel')
        const searchDto  = new NCOSLevelSearchDto()
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
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.billing.NCOSLevel.createQueryBuilder('ncosLevel')
        const searchDto = new NCOSLevelSearchDto()
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
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.NCOSLevel>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.NCOSLevel.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.NCOSLevel.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.NCOSLevel.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.NCOSLevel>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', {id: filterBy.resellerId})
            }
            if (filterBy.exposeToCustomer) {
                qb.andWhere('expose_to_customer = :etc', {etc: filterBy.exposeToCustomer})
            }
        }
    }
}
