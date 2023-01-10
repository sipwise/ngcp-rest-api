import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {NCOSSetSearchDto} from '../dto/ncos-set-search.dto'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {NCOSSetRepository} from '../interfaces/ncos-set.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {LoggerService} from '../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {NCOSSetLevelSearchDto} from '../dto/ncos-set-level-search.dto'

interface FilterBy {
    resellerId?: number
}

@Injectable()
export class NCOSSetMariadbRepository implements NCOSSetRepository {
    private readonly log = new LoggerService(NCOSSetMariadbRepository.name)

    @HandleDbErrors
    async create(entity: internal.NCOSSet, sr: ServiceRequest): Promise<internal.NCOSSet> {
        const dbEntity = db.billing.NCOSSet.create()
        dbEntity.fromInternal(entity)

        await db.billing.NCOSSet.insert(dbEntity)

        return dbEntity.toInternal()
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.NCOSSet[], number]> {
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const searchDto  = new NCOSSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
        ))
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
                    result.map(async (d) =>
                        d.toInternal()
                    )
                ), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSet> {
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const searchDto  = new NCOSSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({ id: id })
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    @HandleDbErrors
    async update(id: number, entity: internal.NCOSSet, sr: ServiceRequest): Promise<internal.NCOSSet> {
        const dbEntity = db.billing.NCOSSet.create()
        dbEntity.fromInternal(entity)
        console.error(entity, dbEntity)
        await db.billing.NCOSSet.update(id, dbEntity)
        return this.readById(id, sr)
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        await db.billing.NCOSSet.findOneByOrFail({ id: id })
        await db.billing.NCOSSet.delete({ id: id })

        return 1
    }

    @HandleDbErrors
    async createLevel(entity: internal.NCOSSetLevel, sr: ServiceRequest): Promise<internal.NCOSSetLevel> {
        const dbEntity = db.billing.NCOSSetLevel.create()
        dbEntity.fromInternal(entity)

        await db.billing.NCOSSetLevel.insert(dbEntity)

        return this.readLevelById(dbEntity.ncos_set_id, dbEntity.id, sr)
    }

    @HandleDbErrors
    async readLevelAll(sr: ServiceRequest, id?: number, filterBy?: FilterBy): Promise<[internal.NCOSSetLevel[], number]> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
                    result.map(async (d) =>
                        d.toInternal()
                    )
                ), totalCount]
    }

    @HandleDbErrors
    async readLevelById(id: number, levelId: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSetLevel> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const searchDto  = new NCOSSetLevelSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({ id: levelId })
        if (id)
            qb.andWhere({ ncos_set_id: id })
        this.addLevelFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    @HandleDbErrors
    async deleteLevel(id: number, levelId: number, sr: ServiceRequest): Promise<number> {
        await db.billing.NCOSSetLevel.delete({ id: levelId })

        return 1
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.NCOSSet>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', { id: filterBy.resellerId })
            }
        }
    }

    private addLevelFilterBy(qb: SelectQueryBuilder<db.billing.NCOSSetLevel>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.innerJoin('ncosSetLevel.set', 'ncosSet')
                qb.andWhere('ncosSet.reseller_id = :id', { id: filterBy.resellerId })
            }
        }
    }
}
