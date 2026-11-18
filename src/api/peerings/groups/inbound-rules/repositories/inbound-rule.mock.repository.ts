import {NotFoundException} from '@nestjs/common'

import {PeeringInboundRuleRepository} from '~/api/peerings/groups/inbound-rules/interfaces/inbound-rule.repository'
import {FilterBy} from '~/api/peerings/groups/inbound-rules/repositories/inbound-rule.mariadb.repository'
import {internal} from '~/entities'
import {VoipPeeringInboundRuleMoveDirection} from '~/entities/internal/voip-peering-inbound-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class PeeringInboundRuleMockRepository implements PeeringInboundRuleRepository {
    readonly db: Record<number, internal.VoipPeeringInboundRule> = {}

    create(rules: internal.VoipPeeringInboundRule[]): Promise<number[]> {
        const ids: number[] = []
        for (const rule of rules) {
            const id = this.getNextId()
            this.db[id] = {...rule, id}
            ids.push(id)
        }
        return Promise.resolve(ids)
    }

    readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.VoipPeeringInboundRule[], number]> {
        const rules = this.rules().filter(rule => !filterBy?.group_id || rule.groupId == filterBy.group_id)
        return Promise.resolve([rules, rules.length])
    }

    readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule> {
        const rule = this.db[id]
        if (!rule || (filterBy?.group_id && rule.groupId != filterBy.group_id))
            throw new NotFoundException()
        return Promise.resolve({...rule})
    }

    readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule[]> {
        const rules = ids.map(id => this.db[id])
            .filter(rule => rule && (!filterBy?.group_id || rule.groupId == filterBy.group_id))
        return Promise.resolve(rules.map(rule => ({...rule})))
    }

    readNeighbour(rule: internal.VoipPeeringInboundRule, direction: VoipPeeringInboundRuleMoveDirection): Promise<internal.VoipPeeringInboundRule | undefined> {
        const ordered = this.rules()
            .filter(entry => entry.groupId == rule.groupId)
            .sort((a, b) => a.priority - b.priority || a.id - b.id)
        const index = ordered.findIndex(entry => entry.id == rule.id)
        const neighbour = ordered[direction == VoipPeeringInboundRuleMoveDirection.Up ? index - 1 : index + 1]
        return Promise.resolve(neighbour && {...neighbour})
    }

    readPriorityConflicts(rules: internal.VoipPeeringInboundRule[], excludeIds: number[]): Promise<internal.VoipPeeringInboundRule[]> {
        const conflicts = this.rules().filter(entry => !excludeIds.includes(entry.id)
            && rules.some(rule => rule.groupId == entry.groupId && rule.priority == entry.priority))
        return Promise.resolve(conflicts.map(rule => ({...rule})))
    }

    lockGroups(_ids: number[]): Promise<void> {
        return Promise.resolve()
    }

    update(updates: Dictionary<internal.VoipPeeringInboundRule>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids)
            this.db[id] = {...updates[id], id}
        return Promise.resolve(ids)
    }

    delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            delete this.db[id]
        return Promise.resolve(ids)
    }

    refreshGroupsHaveInboundRules(_groupIds: number[]): Promise<void> {
        return Promise.resolve()
    }

    private rules(): internal.VoipPeeringInboundRule[] {
        return Object.values(this.db)
    }

    private getNextId(): number {
        const ids = Object.keys(this.db).map(id => +id)
        return ids.length ? Math.max(...ids) + 1 : 1
    }
}
