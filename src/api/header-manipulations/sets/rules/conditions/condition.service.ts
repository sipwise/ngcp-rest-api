import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, HeaderManipulationRuleConditionMariadbRepository} from './repositories/condition.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/set.redis.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/rule.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class HeaderManipulationRuleConditionService implements CrudService<internal.HeaderRuleCondition> {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationRuleConditionMariadbRepository) private readonly ruleConditionRepo: HeaderManipulationRuleConditionMariadbRepository,
        @Inject(HeaderManipulationRuleMariadbRepository) private readonly ruleRepo: HeaderManipulationRuleMariadbRepository,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
        @Inject(HeaderManipulationSetRedisRepository) private readonly ruleSetRedisRepo: HeaderManipulationSetRedisRepository,
    ) {
    }

    async create(entities: internal.HeaderRuleCondition[], sr: ServiceRequest): Promise<internal.HeaderRuleCondition[]> {
        const rules = await this.ruleRepo.readWhereInIds(entities.map(entity => entity.ruleId), sr)
        if (sr.user.reseller_id_required) {
            const sets = await this.ruleSetRepo.readWhereInIds(rules.map(rule => rule.setId), sr)
            const foreignSetIds = sets.filter(set => set.resellerId != sr.user.reseller_id).map(set => set.id)
            const errors = new ApiErrors()
            entities.forEach((entity, index) => {
                if (rules.some(rule => rule.id == entity.ruleId && foreignSetIds.includes(rule.setId)))
                    errors.add(this.i18n.t('errors.ENTRY_NOT_FOUND'), itemPointer(sr, index, entity, 'ruleId'))
            })
            errors.throwIfAny()
        }

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

        const createdIds = await this.ruleConditionRepo.create(entities)
        return await this.ruleConditionRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleCondition[], number]> {
        const filterBy: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberConditions = true

        return await this.ruleConditionRepo.readAll(sr, filterBy)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleCondition> {
        const filterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberConditions = true

        return await this.ruleConditionRepo.readById(id, sr, filterBy)
    }

    async update(updates: Dictionary<internal.HeaderRuleCondition>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        let conditions: internal.HeaderRuleCondition[]
        if (sr.user.reseller_id_required) {
            conditions = await this.ruleConditionRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            conditions = await this.ruleConditionRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, conditions.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const rules = await this.ruleRepo.readWhereInIds(conditions.map(condition => condition.ruleId), sr)

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

        const resetValues: boolean = sr.req.method == 'PUT'
        return await this.ruleConditionRepo.update(updates, sr, resetValues)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let conditions: internal.HeaderRuleCondition[]
        if (sr.user.reseller_id_required) {
            conditions = await this.ruleConditionRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            conditions = await this.ruleConditionRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, conditions.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const rules = await this.ruleRepo.readWhereInIds(conditions.map(condition => condition.ruleId), sr)

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

        return await this.ruleConditionRepo.delete(ids,sr)
    }

    async readAllConditionValues(conditionId: number, sr: ServiceRequest): Promise<[internal.HeaderRuleConditionValue[], number]> {
        const filterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberConditions = true

        return await this.ruleConditionRepo.readConditionValues(conditionId, sr, filterBy)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['setId']) {
            filterBy.setId = +sr.params['setId']
        }
        if (sr.params && sr.params['ruleId']) {
            filterBy.ruleId = +sr.params['ruleId']
        }

        return filterBy
    }

    // TODO: required for mocking, as esbuild-jest has issues with jest mock
    // patterns and will be reviewed after packages upgrade
    async invalidateRuleSetAfterCommit(setId: number, sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => await this.ruleSetRedisRepo.invalidateRuleSet(setId, sr))
    }
}
