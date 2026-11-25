
import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, RewriteRuleMariadbRepository} from './repositories/rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './repositories/rule.redis.repository'

import {RewriteRuleSetMariadbRepository} from '~/api/rewrite-rules/sets/repositories/set.mariadb.repository'
import {internal} from '~/entities'
import {RewriteRuleMoveDirection} from '~/entities/internal/rewrite-rule.internal.entity'
import {cloneEntity} from '~/helpers/clone.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, apiError, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnceOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class RewriteRuleService implements CrudService<internal.RewriteRule> {
    private readonly log = new LoggerService(RewriteRuleService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(RewriteRuleMariadbRepository) private readonly ruleRepo: RewriteRuleMariadbRepository,
        @Inject(RewriteRuleSetMariadbRepository) private readonly ruleSetRepo: RewriteRuleSetMariadbRepository,
        @Inject(RewriteRuleRedisRepository) private readonly ruleRedisRepo: RewriteRuleRedisRepository,
    ) {
    }

    async create(entities: internal.RewriteRule[], sr: ServiceRequest): Promise<internal.RewriteRule[]> {
        if (sr.user.reseller_id_required) {
            const sets = await this.ruleSetRepo.readWhereInIds(entities.map(entity => entity.setId), sr)
            const foreignSetIds = new Set(sets.filter(set => set.resellerId != sr.user.reseller_id).map(set => set.id))
            const errors = new ApiErrors()
            await forEachYield(entities, (entity, index) => {
                if (foreignSetIds.has(entity.setId))
                    errors.add(this.i18n.t('errors.ENTRY_NOT_FOUND'), itemPointer(sr, index, entity, 'setId'))
            })
            errors.throwIfAny()
        }

        await this.ruleRepo.lockSets(entities.map(entity => entity.setId))
        await this.assignPriorities(entities)
        await forEachYield(entities, entity => this.deflateMatchReplacePatterns(entity))
        await this.checkUniquePriorities(entities, Object.keys(entities), sr)

        const createdIds = await this.ruleRepo.create(entities)

        this.reloadDialPlanAfterCommit(sr)

        return await this.ruleRepo.readWhereInIds(createdIds, sr)
    }

    async clone(id: number, overrides: internal.RewriteRule, sr: ServiceRequest): Promise<internal.RewriteRule> {
        const source = await this.read(id, sr)
        const [created] = await this.create([cloneEntity(source, overrides, ['priority'])], sr)
        return created
    }

    async readAll(sr: ServiceRequest): Promise<[internal.RewriteRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        const [entities, totalCount] = await this.ruleRepo.readAll(sr, filters)

        entities.forEach(entity => {
            this.inflateMatchReplacePatterns(entity)
        })

        return [entities, totalCount]
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.RewriteRule> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        const entity = await this.ruleRepo.readById(id, sr, filters)

        this.inflateMatchReplacePatterns(entity)

        return entity
    }

    async update(updates: Dictionary<internal.RewriteRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let rules: internal.RewriteRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, rules.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // a field missing in the update (priority of a PUT, any field of a PATCH) counts as the stored one, rules
        // keeping set, direction, field and priority are not checked, so legacy duplicates stay editable
        const storedRules = new Map(rules.map(rule => [rule.id, rule]))
        const finalRules = new Dictionary<internal.RewriteRule>()
        const changedIds: string[] = []
        await forEachYield(Object.entries(updates), ([id, update]) => {
            const stored = storedRules.get(+id)
            const final = {
                ...update,
                setId: update.setId ?? stored.setId,
                direction: update.direction ?? stored.direction,
                field: update.field ?? stored.field,
                priority: update.priority ?? stored.priority,
            }
            finalRules[id] = final
            if (final.setId != stored.setId || final.direction != stored.direction
                || final.field != stored.field || final.priority != stored.priority)
                changedIds.push(id)
        })
        await this.ruleRepo.lockSets(changedIds.flatMap(id => [storedRules.get(+id).setId, finalRules[id].setId]))
        await this.checkUniquePriorities(finalRules, changedIds, sr)

        await forEachYield(Object.values(updates), entity => this.deflateMatchReplacePatterns(entity))

        const updatedIds = await this.ruleRepo.update(updates, sr)

        this.reloadDialPlanAfterCommit(sr)

        return updatedIds
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let rules: internal.RewriteRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, rules.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const deletedIds = await this.ruleRepo.delete(ids,sr)

        this.reloadDialPlanAfterCommit(sr)

        return deletedIds
    }

    /**
     * Swaps the priorities of the rule and the previous (up) or next (down) rule of its set, direction and field.
     * On a tie the rule gets the neighbour's priority - 1 (up) or + 1 (down) instead.
     * Returns the changed rules.
     */
    async move(id: number, direction: RewriteRuleMoveDirection, sr: ServiceRequest): Promise<internal.RewriteRule[]> {
        const rule = await this.read(id, sr)
        await this.ruleRepo.lockSets([rule.setId])
        const neighbour = await this.ruleRepo.readNeighbour(rule, direction)
        if (!neighbour)
            throw apiError(this.i18n.t('errors.REWRITE_RULE_CANNOT_MOVE', {args: {direction}}), '/direction')

        let changed: internal.RewriteRule[]
        if (neighbour.priority != rule.priority) {
            // the dialplan trigger finds its row by the rule's patterns and priority: two rules with identical
            // patterns must never hold the same priority, so the swap goes through an unused one
            [rule.priority, neighbour.priority] = [neighbour.priority, rule.priority]
            const maxPriorities = await this.ruleRepo.readMaxPriorities([rule.setId])
            await this.ruleRepo.updatePriority(neighbour.id, maxPriorities.get(rule.setId) + 1)
            await this.ruleRepo.updatePriority(rule.id, rule.priority)
            await this.ruleRepo.updatePriority(neighbour.id, neighbour.priority)
            this.inflateMatchReplacePatterns(neighbour)
            changed = [rule, neighbour]
        } else {
            const priority = direction == RewriteRuleMoveDirection.Up ? neighbour.priority - 1 : neighbour.priority + 1
            if (priority < 0)
                throw apiError(this.i18n.t('errors.REWRITE_RULE_CANNOT_MOVE', {args: {direction}}), '/direction')
            const conflicts = await this.ruleRepo.readPriorityConflicts([{...rule, priority}], [rule.id])
            if (conflicts.length)
                throw apiError(this.i18n.t('errors.REWRITE_RULE_PRIORITY_EXISTS', {args: {priority}}), '/direction')
            await this.ruleRepo.updatePriority(rule.id, priority)
            rule.priority = priority
            changed = [rule]
        }

        this.reloadDialPlanAfterCommit(sr)
        return changed
    }

    // TODO: required for mocking, as esbuild-jest has issues with jest mock"
    // patterns and will be reviewed after packages upgrade
    reloadDialPlanAfterCommit(sr: ServiceRequest): void {
        runOnceOnTransactionCommit('rewrite-rules-dialplan-reload', async () => await this.ruleRedisRepo.reloadDialPlan(sr))
    }

    /**
     * Rules without priority get the next ones after the highest priority of their set, in request order
     */
    private async assignPriorities(entities: internal.RewriteRule[]): Promise<void> {
        const unprioritizedSetIds = new Set(entities.filter(entity => entity.priority == undefined).map(entity => entity.setId))
        if (!unprioritizedSetIds.size)
            return
        const highest = await this.ruleRepo.readMaxPriorities([...unprioritizedSetIds])
        await forEachYield(entities, entity => {
            if (entity.priority != undefined && unprioritizedSetIds.has(entity.setId))
                highest.set(entity.setId, Math.max(highest.get(entity.setId) ?? 0, entity.priority))
        })
        await forEachYield(entities, entity => {
            if (entity.priority == undefined) {
                entity.priority = (highest.get(entity.setId) ?? 0) + 1
                highest.set(entity.setId, entity.priority)
            }
        })
    }

    /**
     * Rejects rules whose set, direction, field and priority are used by another rule, of the request or not
     * @param rules final state of the request's rules, by index (POST) or id (PUT/PATCH)
     * @param keys indexes or ids of the rules to check
     */
    private async checkUniquePriorities(rules: internal.RewriteRule[] | Dictionary<internal.RewriteRule>, keys: string[], sr: ServiceRequest): Promise<void> {
        if (!keys.length)
            return
        const slot = (rule: internal.RewriteRule): string => `${rule.setId}:${rule.direction}:${rule.field}:${rule.priority}`
        const requestRules = Object.values(rules)
        const requestCounts = new Map<string, number>()
        await forEachYield(requestRules, rule => requestCounts.set(slot(rule), (requestCounts.get(slot(rule)) ?? 0) + 1))
        const requestIds = requestRules.map(rule => rule.id).filter(id => id != undefined)
        const checkedKeys = new Set(keys)
        const checked = Object.entries(rules).filter(([key]) => checkedKeys.has(key))
        const conflicts = await this.ruleRepo.readPriorityConflicts(checked.map(([, rule]) => rule), requestIds)
        const usedSlots = new Set(conflicts.map(slot))

        const errors = new ApiErrors()
        await forEachYield(checked, ([key, rule]) => {
            if (requestCounts.get(slot(rule)) > 1 || usedSlots.has(slot(rule)))
                errors.add(this.i18n.t('errors.REWRITE_RULE_PRIORITY_EXISTS', {args: {priority: rule.priority}}), itemPointer(sr, key, rule, 'priority'))
        })
        errors.throwIfAny()
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['setId']) {
            filterBy.setId = +sr.params['setId']
        }
        return filterBy
    }

    private inflateMatchReplacePatterns(entity: internal.RewriteRule): void {
        if (entity.matchPattern) {
            entity.matchPattern = entity.matchPattern.replace(/\$avp\(s:(\w+)\)/g, '${$1}')
            entity.matchPattern = entity.matchPattern.replace(/\$\(avp\(s:(\w+)\)\[\+\]\)/g, '@{$1}')
        }

        if (entity.replacePattern) {
            entity.replacePattern = entity.replacePattern.replace(/\$avp\(s:(\w+)\)/g, '${$1}')
        }
    }

    private deflateMatchReplacePatterns(entity: internal.RewriteRule): void {
        if (entity.matchPattern) {
            entity.matchPattern = entity.matchPattern.replace(/\$\{(\w+)\}/g, '$avp(s:$1)')
            entity.matchPattern = entity.matchPattern.replace(/@\{(\w+)\}/g, '$(avp(s:$1)[+])')
        }

        if (entity.replacePattern) {
            entity.replacePattern = entity.replacePattern.replace(/\$\{(\w+)\}/g, '$avp(s:$1)')
        }
    }

}
