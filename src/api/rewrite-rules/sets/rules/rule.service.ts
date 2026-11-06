
import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, RewriteRuleMariadbRepository} from './repositories/rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './repositories/rule.redis.repository'

import {RewriteRuleSetMariadbRepository} from '~/api/rewrite-rules/sets/repositories/set.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
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
            const errors = new ApiErrors()
            entities.forEach((entity, index) => {
                if (sets.some(set => set.id == entity.setId && set.resellerId != sr.user.reseller_id))
                    errors.add(this.i18n.t('errors.ENTRY_NOT_FOUND'), itemPointer(sr, index, entity, 'setId'))
            })
            errors.throwIfAny()
        }

        // TODO: Can this be done in a single query?
        const maxPriorities = []
        for (const entity of entities) {
            if (!entity.priority) {
                if (!maxPriorities[entity.setId]) {
                    maxPriorities[entity.setId] = await this.ruleRepo.readMaxPriorityInSet(entity.setId, sr)
                }
                entity.priority = maxPriorities[entity.setId] + 1
            }

            this.deflateMatchReplacePatterns(entity)
        }

        const createdIds = await this.ruleRepo.create(entities)

        await this.reloadDialPlanAfterCommit(sr)

        return await this.ruleRepo.readWhereInIds(createdIds, sr)
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

        Object.values(updates).forEach(entity => {
            this.deflateMatchReplacePatterns(entity)
        })

        const updatedIds = await this.ruleRepo.update(updates, sr)

        await this.reloadDialPlanAfterCommit(sr)

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

        await this.reloadDialPlanAfterCommit(sr)

        return deletedIds
    }

    // TODO: required for mocking, as esbuild-jest has issues with jest mock"
    // patterns and will be reviewed after packages upgrade
    async reloadDialPlanAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => await this.ruleRedisRepo.reloadDialPlan(sr))
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
