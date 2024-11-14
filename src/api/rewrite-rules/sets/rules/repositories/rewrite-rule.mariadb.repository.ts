import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {RewriteRuleSearchDto} from '~/api/rewrite-rules/sets/rules/dto/rewrite-rule-search.dto'
import {RewriteRuleRepository} from '~/api/rewrite-rules/sets/rules/interfaces/rewrite-rule.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
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
export class RewriteRuleMariadbRepository extends MariaDbRepository implements RewriteRuleRepository {
    private readonly log = new LoggerService(RewriteRuleMariadbRepository.name)

    async create(entities: internal.RewriteRule[]): Promise<number[]> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipRewriteRule().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()
        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.RewriteRule[], number]> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        const searchDto  = new RewriteRuleSearchDto()
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
        qb.innerJoin('rewriteRule.set', 'rewriteRuleSet')
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRule> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        const searchDto  = new RewriteRuleSearchDto()
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
        qb.innerJoin('rewriteRule.set', 'rewriteRuleSet')
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readCountInSet(setId: number, _sr: ServiceRequest): Promise<number> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        qb.where('set_id = :setId', {setId: setId})
        return await qb.getCount()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRule[]> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        const searchDto  = new RewriteRuleSearchDto()
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
        qb.innerJoin('rewriteRule.set', 'rewriteRuleSet')
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        const searchDto = new RewriteRuleSearchDto()
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
        qb.innerJoin('rewriteRule.set', 'rewriteRuleSet')
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.RewriteRule>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipRewriteRule.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipRewriteRule.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipRewriteRule.delete(ids)
        return ids
    }

    async readMaxPriorityInSet(setId: number, _sr: ServiceRequest): Promise<number> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        qb.select('MAX(priority)', 'max')
        qb.where('set_id = :setId', {setId: setId})
        const result = await qb.getRawOne()
        return result.max as number || 0
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipRewriteRule>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.setId) {
                qb.andWhere('set_id = :setId', {setId: filterBy.setId})
            }
            if (filterBy.resellerId) {
                qb.andWhere('rewriteRuleSet.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
