import {internal} from '~/entities'
import {RewriteRuleMoveDirection} from '~/entities/internal/rewrite-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface RewriteRuleRepository {
    create(sd: internal.RewriteRule[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.RewriteRule[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.RewriteRule>

    readNeighbour(rule: internal.RewriteRule, direction: RewriteRuleMoveDirection): Promise<internal.RewriteRule | undefined>

    readPriorityConflicts(rules: internal.RewriteRule[], excludeIds: number[]): Promise<internal.RewriteRule[]>

    readMaxPriorities(setIds: number[]): Promise<Map<number, number>>

    lockSets(ids: number[]): Promise<void>

    updatePriority(id: number, priority: number): Promise<void>

    update(updates: Dictionary<internal.RewriteRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
