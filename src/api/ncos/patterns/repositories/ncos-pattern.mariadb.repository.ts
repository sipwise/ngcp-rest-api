import {Injectable} from '@nestjs/common'
import {In, SelectQueryBuilder} from 'typeorm'

import {NCOSPatternSearchDto} from '~/api/ncos/patterns/dto/ncos-pattern-search.dto'
import {NCOSPatternRepository} from '~/api/ncos/patterns/interfaces/ncos-pattern.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

interface FilterBy {
    resellerId?: number
}

@Injectable()
export class NCOSPatternMariadbRepository extends MariaDbRepository implements NCOSPatternRepository {
    private readonly log = new LoggerService(NCOSPatternMariadbRepository.name)

    async create(entities: internal.NCOSPattern[]): Promise<number[]> {
        const qb = db.billing.NCOSPattern.createQueryBuilder('pattern')
        const values = await Promise.all(entities.map(async entity => new db.billing.NCOSPattern().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.NCOSPattern[], number]> {
        const qb = db.billing.NCOSPattern.createQueryBuilder('pattern')
        qb.leftJoinAndSelect('pattern.level', 'level')
        const searchDto  = new NCOSPatternSearchDto()
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

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSPattern> {
        const qb = db.billing.NCOSPattern.createQueryBuilder('pattern')
        qb.leftJoinAndSelect('pattern.level', 'level')
        const searchDto  = new NCOSPatternSearchDto()
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

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSPattern[]> {
        const qb = db.billing.NCOSPattern.createQueryBuilder('pattern')
        qb.leftJoinAndSelect('pattern.level', 'level')
        const searchDto  = new NCOSPatternSearchDto()
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
        const qb = db.billing.NCOSPattern.createQueryBuilder('pattern')
        qb.leftJoinAndSelect('pattern.level', 'level')
        const searchDto = new NCOSPatternSearchDto()
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

    async update(updates: Dictionary<internal.NCOSPattern>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.NCOSPattern.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.NCOSPattern.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.NCOSPattern.delete(ids)
        return ids
    }

    async hasAccessToLevels(ids: Set<number>, reseller_id: number, _sr: ServiceRequest): Promise<boolean> {
        const qb = db.billing.NCOSPattern.createQueryBuilder('pattern')
            .leftJoinAndSelect('pattern.level', 'level')
            .where({id: In(Array.from(ids))})
            .andWhere('level.reseller_id = :id', {_id: reseller_id})

        const result = await qb.getCount()

        return result == ids.size
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.NCOSPattern>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('level.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
