import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {NCOSSetLevelSearchDto} from '~/api/ncos/sets/levels/dto/level-search.dto'
import {NCOSSetLevelRepository} from '~/api/ncos/sets/levels/interfaces/level.repository'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    setId?: number
    resellerId?: number
}

@Injectable()
export class NCOSSetLevelMariadbRepository extends MariaDbRepository implements NCOSSetLevelRepository {
    private readonly log = new LoggerService(NCOSSetLevelMariadbRepository.name)

    async create(entities: internal.NCOSSetLevel[]): Promise<number[]> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        const values = await Promise.all(
            entities.map(
                async entity => new db.billing.NCOSSetLevel().fromInternal(entity),
            ),
        )
        const result = await qb.insert().values(values).execute()
        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.NCOSSetLevel[], number]> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const searchDto  = new NCOSSetLevelSearchDto()
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

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSetLevel> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const searchDto  = new NCOSSetLevelSearchDto()
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

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSetLevel[]> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const searchDto  = new NCOSSetLevelSearchDto()
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

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.NCOSSetLevel.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.NCOSSetLevel>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.setId) {
                qb.andWhere('ncos_set_id = :setId', {setId: filterBy.setId})
            }
            if (filterBy.resellerId) {
                qb.innerJoin('ncosSetLevel.set', 'ncosSet')
                qb.andWhere('ncosSet.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
