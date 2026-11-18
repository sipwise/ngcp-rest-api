import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, HeaderManipulationRuleConditionMariadbRepository} from './repositories/condition.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/set.redis.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/rule.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {applyLazyFields, mergeLazyFields, readLazyField} from '~/helpers/lazy-field.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class HeaderManipulationRuleConditionService implements CrudService<internal.HeaderRuleCondition> {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionService.name)
    readonly lazyFields: LazyFieldSources

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationRuleConditionMariadbRepository) private readonly ruleConditionRepo: HeaderManipulationRuleConditionMariadbRepository,
        @Inject(HeaderManipulationRuleMariadbRepository) private readonly ruleRepo: HeaderManipulationRuleMariadbRepository,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
        @Inject(HeaderManipulationSetRedisRepository) private readonly ruleSetRedisRepo: HeaderManipulationSetRedisRepository,
    ) {
        this.lazyFields = mergeLazyFields(ruleConditionRepo.lazyFields)
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

        this.invalidateRuleSetsAfterCommit(rules.map(rule => rule.setId), sr)

        const createdIds = await this.ruleConditionRepo.create(entities)
        const created = await this.ruleConditionRepo.readWhereInIds(createdIds, sr)
        await applyLazyFields(created, this.lazyFields, sr)
        return created
    }

    async readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleCondition[], number]> {
        const filterBy: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberConditions = true

        const [conditions, totalCount] = await this.ruleConditionRepo.readAll(sr, filterBy)
        await applyLazyFields(conditions, this.lazyFields, sr)
        return [conditions, totalCount]
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleCondition> {
        const filterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberConditions = true

        const condition = await this.ruleConditionRepo.readById(id, sr, filterBy)
        await applyLazyFields([condition], this.lazyFields, sr)
        return condition
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

        this.invalidateRuleSetsAfterCommit(rules.map(rule => rule.setId), sr)

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

        this.invalidateRuleSetsAfterCommit(rules.map(rule => rule.setId), sr)

        return await this.ruleConditionRepo.delete(ids,sr)
    }

    /**
     * A page of a lazy field of the condition (`<item>/@<field>`)
     * @param toResponse response DTO of the condition for the caller, 404 when it hides the field
     */
    async readField(
        id: number,
        field: string,
        sr: ServiceRequest,
        toResponse: (condition: internal.HeaderRuleCondition) => object,
    ): Promise<[unknown[], number]> {
        const filterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        // subscriber_id selects a condition of the subscriber's set, as on the item read; it filters no field
        const {subscriber_id: subscriberId, ...query} = sr.query
        if (subscriberId) {
            filterBy.showSubscriberConditions = true
            filterBy.subscriberId = +subscriberId
        }

        const condition = await this.ruleConditionRepo.readBareById(id, filterBy)
        return await readLazyField(condition, field, this.lazyFields, {...sr, query}, toResponse)
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

    private invalidateRuleSetsAfterCommit(setIds: number[], sr: ServiceRequest): void {
        for (const setId of new Set(setIds))
            runOnTransactionCommit(async () => await this.ruleSetRedisRepo.invalidateRuleSet(setId, sr))
    }
}
