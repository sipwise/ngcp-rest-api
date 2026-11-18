import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, PeeringInboundRuleMariadbRepository} from './repositories/inbound-rule.mariadb.repository'
import {PeeringInboundRuleRedisRepository} from './repositories/inbound-rule.redis.repository'

import {internal} from '~/entities'
import {VoipPeeringInboundRuleMoveDirection} from '~/entities/internal/voip-peering-inbound-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, apiError, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringInboundRuleService implements CrudService<internal.VoipPeeringInboundRule> {
    private readonly log = new LoggerService(PeeringInboundRuleService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringInboundRuleMariadbRepository) private readonly ruleRepo: PeeringInboundRuleMariadbRepository,
        @Inject(PeeringInboundRuleRedisRepository) private readonly ruleRedisRepo: PeeringInboundRuleRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringInboundRule[], sr: ServiceRequest): Promise<internal.VoipPeeringInboundRule[]> {
        await this.ruleRepo.lockGroups(entities.map(entity => entity.groupId))
        await this.checkUniquePriorities(entities, Object.keys(entities), sr)
        const created = await this.ruleRepo.create(entities)
        await this.ruleRepo.refreshGroupsHaveInboundRules([...new Set(entities.map(entity => entity.groupId))])
        this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(entities)) {
            this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        return this.ruleRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringInboundRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.ruleRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringInboundRule> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.ruleRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.VoipPeeringInboundRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const rules = await this.ruleRepo.readWhereInIds(ids, sr)

        throwMissingIds(sr, ids, rules.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // rules keeping group and priority are not checked, so legacy duplicates stay editable
        const reordered = rules.filter(rule => updates[rule.id].groupId != rule.groupId || updates[rule.id].priority != rule.priority)
        await this.ruleRepo.lockGroups(reordered.flatMap(rule => [rule.groupId, updates[rule.id].groupId]))
        await this.checkUniquePriorities(updates, reordered.map(rule => `${rule.id}`), sr)

        // Always reload LCR
        this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReloadOnUpdate(rules, updates)) {
            this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        const result = await this.ruleRepo.update(updates, sr)

        const movedGroupIds = new Set<number>()
        for (const rule of rules) {
            const groupId = updates[rule.id].groupId
            if (groupId != rule.groupId) {
                movedGroupIds.add(rule.groupId)
                movedGroupIds.add(groupId)
            }
        }
        await this.ruleRepo.refreshGroupsHaveInboundRules([...movedGroupIds])

        return result
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const rules = await this.ruleRepo.readWhereInIds(ids, sr)
        throwMissingIds(sr, ids, rules.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // Always reload LCR
        this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReload(rules)) {
            this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        const result = await this.ruleRepo.delete(ids, sr)

        await this.ruleRepo.refreshGroupsHaveInboundRules([...new Set(rules.map(rule => rule.groupId))])

        return result
    }

    /**
     * Swaps the priorities of the rule and the previous (up) or next (down) rule of its group.
     * On a tie the rule gets the neighbour's priority - 1 (up) or + 1 (down) instead.
     * Returns the changed rules.
     */
    async move(id: number, direction: VoipPeeringInboundRuleMoveDirection, sr: ServiceRequest): Promise<internal.VoipPeeringInboundRule[]> {
        const rule = await this.read(id, sr)
        await this.ruleRepo.lockGroups([rule.groupId])
        const neighbour = await this.ruleRepo.readNeighbour(rule, direction)
        if (!neighbour)
            throw apiError(this.i18n.t('errors.PEERING_INBOUND_RULE_CANNOT_MOVE', {args: {direction}}), '/direction')

        let changed: internal.VoipPeeringInboundRule[]
        if (neighbour.priority != rule.priority) {
            [rule.priority, neighbour.priority] = [neighbour.priority, rule.priority]
            changed = [rule, neighbour]
        } else {
            rule.priority = direction == VoipPeeringInboundRuleMoveDirection.Up ? neighbour.priority - 1 : neighbour.priority + 1
            if (rule.priority < 1)
                throw apiError(this.i18n.t('errors.PEERING_INBOUND_RULE_CANNOT_MOVE', {args: {direction}}), '/direction')
            if ((await this.ruleRepo.readPriorityConflicts([rule], [rule.id])).length)
                throw apiError(this.i18n.t('errors.PEERING_INBOUND_RULE_PRIORITY_EXISTS', {args: {priority: rule.priority}}), '/direction')
            changed = [rule]
        }

        this.reloadKamProxyLcrAfterCommit(sr)
        await this.ruleRepo.update(Object.fromEntries(changed.map(entry => [entry.id, entry])), sr)
        return changed
    }

    reloadKamProxyLcrAfterCommit(sr: ServiceRequest): void {
        runOnTransactionCommit(async () => {
            await this.ruleRedisRepo.reloadKamProxLcr(sr)
        })
    }

    reloadKamProxyDispatcherAfterCommit(sr: ServiceRequest): void {
        runOnTransactionCommit(async () => {
            await this.ruleRedisRepo.reloadKamProxDispatcher(sr)
        })
    }

    private requiresDispatcherReloadOnUpdate(oldRules: internal.VoipPeeringInboundRule[], updates: Dictionary<internal.VoipPeeringInboundRule>): boolean {
        return oldRules.some(rule => {
            const updated = updates[rule.id]
            if (!updated) return false
            return rule.enabled !== updated.enabled
        })
    }

    private requiresDispatcherReload(rules: internal.VoipPeeringInboundRule[]): boolean {
        return rules.some(rule => rule.enabled)
    }

    /**
     * Rejects rules whose group and priority are used by another rule, of the request or not
     * @param rules final state of the request's rules, by index (POST) or id (PUT/PATCH)
     * @param keys indexes or ids of the rules to check
     */
    private async checkUniquePriorities(rules: internal.VoipPeeringInboundRule[] | Dictionary<internal.VoipPeeringInboundRule>, keys: string[], sr: ServiceRequest): Promise<void> {
        if (!keys.length)
            return
        const slot = (rule: internal.VoipPeeringInboundRule): string => `${rule.groupId}:${rule.priority}`
        const requestRules = Object.values(rules)
        const requestCounts = new Map<string, number>()
        for (const rule of requestRules)
            requestCounts.set(slot(rule), (requestCounts.get(slot(rule)) ?? 0) + 1)
        const requestIds = requestRules.map(rule => rule.id).filter(id => id != undefined)
        const checkedKeys = new Set(keys)
        const checked = Object.entries(rules).filter(([key]) => checkedKeys.has(key))
        const conflicts = await this.ruleRepo.readPriorityConflicts(checked.map(([, rule]) => rule), requestIds)
        const usedSlots = new Set(conflicts.map(slot))

        const errors = new ApiErrors()
        await forEachYield(checked, ([key, rule]) => {
            if (requestCounts.get(slot(rule)) > 1 || usedSlots.has(slot(rule)))
                errors.add(this.i18n.t('errors.PEERING_INBOUND_RULE_PRIORITY_EXISTS', {args: {priority: rule.priority}}), itemPointer(sr, key, rule, 'priority'))
        })
        errors.throwIfAny()
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['groupId']) {
            filterBy.group_id = +sr.params['groupId']
        }
        return filterBy
    }
}
