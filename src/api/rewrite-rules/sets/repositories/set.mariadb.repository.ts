import {Injectable} from '@nestjs/common'
import {In, SelectQueryBuilder} from 'typeorm'

import {RewriteRuleSetSearchDto} from '~/api/rewrite-rules/sets/dto/set-search.dto'
import {RewriteRuleSetRepository} from '~/api/rewrite-rules/sets/interfaces/set.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
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
        const values = await mapYield(entities, entity => new db.provisioning.VoipRewriteRuleSet().fromInternal(entity))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
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
                undefined,
                searchDto._alias,
            ),
        )
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await mapYield(result, d => d.toInternal()), totalCount]
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
                undefined,
                searchDto._alias,
            ),
        )
        qb.andWhere({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRuleSet[]> {
        const qb = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await mapYield(result, d => d.toInternal())
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
                undefined,
                searchDto._alias,
            ),
        )
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.RewriteRuleSet>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipRewriteRuleSet.create()
            dbEntity.fromInternal(updates[id])
            // the *_dpid columns are assigned on insert, dialplan rows and preferences reference them
            const {reseller_id, name, description} = dbEntity
            await db.provisioning.VoipRewriteRuleSet.update(id, {reseller_id, name, description})
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipRewriteRuleSet.delete(ids)
        return ids
    }

    async hasRules(ids: number[]): Promise<boolean> {
        return await db.provisioning.VoipRewriteRule.existsBy({set_id: In(ids)})
    }

    async readTakenNames(names: string[]): Promise<string[]> {
        const sets = await db.provisioning.VoipRewriteRuleSet.find({select: {id: true, name: true}, where: {name: In(names)}})
        return sets.map(set => set.name)
    }

    // returns the number of copied rules
    async copyRules(fromSetId: number, toSetId: number): Promise<number> {
        const result: {affectedRows: number} = await db.provisioning.VoipRewriteRule.query(`
            INSERT INTO provisioning.voip_rewrite_rules
                (set_id, match_pattern, replace_pattern, description, direction, field, priority, enabled)
            SELECT ?, match_pattern, replace_pattern, description, direction, field, priority, enabled
              FROM provisioning.voip_rewrite_rules
             WHERE set_id = ?
             ORDER BY id
        `, [toSetId, fromSetId])
        return result.affectedRows
    }

    // returns the number of deleted rules
    async cleanSets(ids: number[], _sr: ServiceRequest): Promise<number> {
        const result = await db.provisioning.VoipRewriteRule.delete({set_id: In(ids)})
        return result.affected
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipRewriteRuleSet>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
