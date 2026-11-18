import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {RewriteRuleSearchDto} from '~/api/rewrite-rules/sets/rules/dto/rule-search.dto'
import {RewriteRuleRepository} from '~/api/rewrite-rules/sets/rules/interfaces/rule.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
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
        const values = await mapYield(entities, entity => new db.provisioning.VoipRewriteRule().fromInternal(entity))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
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
        return [await mapYield(result, d => d.toInternal()), totalCount]
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
        qb.andWhere({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readCountInSet(setId: number, _sr: ServiceRequest): Promise<number> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        qb.where('set_id = :setId', {setId: setId})
        return await qb.getCount()
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRule[]> {
        const qb = db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
        qb.innerJoin('rewriteRule.set', 'rewriteRuleSet')
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await mapYield(result, (d) => d.toInternal())
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
        qb.andWhereInIds(ids)
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

    // highest rule priority of each set of `setIds` that has rules
    async readMaxPriorities(setIds: number[]): Promise<Map<number, number>> {
        if (!setIds.length)
            return new Map()
        const rows = await db.provisioning.VoipRewriteRule.createQueryBuilder('rewriteRule')
            .select('rewriteRule.set_id', 'setId')
            .addSelect('MAX(rewriteRule.priority)', 'max')
            .where('rewriteRule.set_id IN (:...setIds)', {setIds})
            .groupBy('rewriteRule.set_id')
            .getRawMany<{setId: number, max: number}>()
        return new Map(rows.map(row => [row.setId, +row.max]))
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
