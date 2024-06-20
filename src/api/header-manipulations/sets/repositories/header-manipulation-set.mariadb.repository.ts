import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../../entities'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {HeaderManipulationSetSearchDto} from '../dto/header-manipulation-set-search.dto'
import {configureQueryBuilder} from '../../../../helpers/query-builder.helper'
import {HeaderManipulationSetRepository} from '../interfaces/header-manipulation-set.repository'
import {SearchLogic} from '../../../../helpers/search-logic.helper'
import {LoggerService} from '../../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {Dictionary} from '../../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../../repositories/mariadb.repository'

interface FilterBy {
    resellerId?: number
}

@Injectable()
export class HeaderManipulationSetMariadbRepository extends MariaDbRepository implements HeaderManipulationSetRepository {
    private readonly log = new LoggerService(HeaderManipulationSetMariadbRepository.name)

    async create(entities: internal.HeaderRuleSet[]): Promise<internal.HeaderRuleSet[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipHeaderRuleSet().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()
        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))
        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleSet[], number]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
        ))
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleSet> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleSet[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto = new HeaderManipulationSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.HeaderRuleSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRuleSet.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipHeaderRuleSet.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipHeaderRuleSet.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRuleSet>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
