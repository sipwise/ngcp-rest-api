import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {PeeringInboundRuleSearchDto} from '~/api/peerings/groups/inbound-rules/dto/peering-inbound-rule-search.dto'
import {PeeringInboundRuleRepository} from '~/api/peerings/groups/inbound-rules/interfaces/peering-inbound-rule.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
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
        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipPeeringInboundRule().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
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
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
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
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule[]> {
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
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
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

    async increaseGroupInboundRulesCount(groupId: number): Promise<void> {
        const group = await db.provisioning.VoipPeeringGroup.findOneOrFail({
            where: {
                id: groupId,
            },
        })
        group.has_inbound_rules += 1
        await db.provisioning.VoipPeeringGroup.update(groupId, group)
    }

    async decreaseGroupInboundRulesCount(groupId: number): Promise<void> {
        const group = await db.provisioning.VoipPeeringGroup.findOneOrFail({
            where: {
                id: groupId,
            },
        })
        group.has_inbound_rules -= 1
        if (group.has_inbound_rules < 0)
            group.has_inbound_rules = 0
        await db.provisioning.VoipPeeringGroup.update(groupId, group)
    }
}
