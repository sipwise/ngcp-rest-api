import {Injectable} from '@nestjs/common'
import {In, SelectQueryBuilder} from 'typeorm'

import {PeeringInboundRuleSearchDto} from '~/api/peerings/groups/inbound-rules/dto/inbound-rule-search.dto'
import {PeeringInboundRuleRepository} from '~/api/peerings/groups/inbound-rules/interfaces/inbound-rule.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    group_id?: number
}

@Injectable()
export class PeeringInboundRuleMariadbRepository extends MariaDbRepository implements PeeringInboundRuleRepository {
    private readonly log = new LoggerService(PeeringInboundRuleMariadbRepository.name)

    async create(entities: internal.VoipPeeringInboundRule[]): Promise<number[]> {
        const qb = db.provisioning.VoipPeeringInboundRule.createQueryBuilder('rule')
        const values = await mapYield(entities, entity => new db.provisioning.VoipPeeringInboundRule().fromInternal(entity))
        const result = await qb.insert().values(values).execute()

        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.VoipPeeringInboundRule[], number]> {
        const qb = db.provisioning.VoipPeeringInboundRule.createQueryBuilder('rule')
        const searchDto  = new PeeringInboundRuleSearchDto()
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

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule> {
        const qb = db.provisioning.VoipPeeringInboundRule.createQueryBuilder('rule')
        const searchDto  = new PeeringInboundRuleSearchDto()
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

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule[]> {
        const qb = db.provisioning.VoipPeeringInboundRule.createQueryBuilder('rule')
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await mapYield(result, (d) => d.toInternal())
    }

    async update(updates: Dictionary<internal.VoipPeeringInboundRule>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipPeeringInboundRule.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipPeeringInboundRule.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipPeeringInboundRule.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipPeeringInboundRule>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.group_id) {
                qb.andWhere('group_id = :groupId', {groupId: filterBy.group_id})
            }
        }
    }

    // sets `has_inbound_rules` of the groups from their current rules
    async refreshGroupsHaveInboundRules(groupIds: number[]): Promise<void> {
        if (!groupIds.length)
            return
        const rows = await db.provisioning.VoipPeeringInboundRule.createQueryBuilder('rule')
            .select('DISTINCT rule.group_id', 'groupId')
            .where('rule.group_id IN (:...groupIds)', {groupIds})
            .getRawMany<{groupId: number}>()
        const withRules = new Set(rows.map(row => row.groupId))
        const withoutRules = groupIds.filter(id => !withRules.has(id))
        if (withRules.size)
            await db.provisioning.VoipPeeringGroup.update({id: In([...withRules])}, {has_inbound_rules: true})
        if (withoutRules.length)
            await db.provisioning.VoipPeeringGroup.update({id: In(withoutRules)}, {has_inbound_rules: false})
    }
}
