import {FilterBy} from '~/api/peerings/groups/inbound-rules/repositories/inbound-rule.mariadb.repository'
import {internal} from '~/entities'
import {VoipPeeringInboundRuleMoveDirection} from '~/entities/internal/voip-peering-inbound-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringInboundRuleRepository {
    create(sd: internal.VoipPeeringInboundRule[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.VoipPeeringInboundRule[], number]>

    readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule>

    readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringInboundRule[]>

    readNeighbour(rule: internal.VoipPeeringInboundRule, direction: VoipPeeringInboundRuleMoveDirection): Promise<internal.VoipPeeringInboundRule | undefined>

    readPriorityConflicts(rules: internal.VoipPeeringInboundRule[], excludeIds: number[]): Promise<internal.VoipPeeringInboundRule[]>

    lockGroups(ids: number[]): Promise<void>

    update(updates: Dictionary<internal.VoipPeeringInboundRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

    refreshGroupsHaveInboundRules(groupIds: number[]): Promise<void>
}
