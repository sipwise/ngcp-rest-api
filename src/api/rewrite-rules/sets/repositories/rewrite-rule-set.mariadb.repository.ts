import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {RewriteRuleSetSearchDto} from '~/api/rewrite-rules/sets/dto/rewrite-rule-set-search.dto'
import {RewriteRuleSetRepository} from '~/api/rewrite-rules/sets/interfaces/rewrite-rule-set.repository'
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
export class RewriteRuleSetMariadbRepository extends MariaDbRepository implements RewriteRuleSetRepository {
    private readonly log = new LoggerService(RewriteRuleSetMariadbRepository.name)

    async create(entities: internal.RewriteRuleSet[]): Promise<number[]> {
        const qb = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const values = await Promise.all(entities.map(async entity => {
            return new db.provisioning.VoipRewriteRuleSet().fromInternal(entity)
        }))
        const result = await qb.insert().values(values).execute()
        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.RewriteRuleSet[], number]> {
        const qb = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const searchDto  = new RewriteRuleSetSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) => {
                return d.toInternal()
            }),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRuleSet> {
        const qb = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const searchDto  = new RewriteRuleSetSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRuleSet[]> {
        const qb = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const searchDto  = new RewriteRuleSetSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => {
            return d.toInternal()
        }))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const searchDto = new RewriteRuleSetSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.RewriteRuleSet>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipRewriteRuleSet.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipRewriteRuleSet.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipRewriteRuleSet.delete(ids)
        return ids
    }

    async deleteAllRules(id: number, _sr: ServiceRequest): Promise<void> {
        const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: id})
        await Promise.all(rules.map(async rule => {
            await rule.remove()
        }))
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipRewriteRuleSet>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
