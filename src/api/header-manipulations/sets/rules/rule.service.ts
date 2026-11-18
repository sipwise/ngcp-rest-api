import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, HeaderManipulationRuleMariadbRepository} from './repositories/rule.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/set.redis.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class HeaderManipulationRuleService implements CrudService<internal.HeaderRule> {
    private readonly log = new LoggerService(HeaderManipulationRuleService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationRuleMariadbRepository) private readonly ruleRepo: HeaderManipulationRuleMariadbRepository,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
        @Inject(HeaderManipulationSetRedisRepository) private readonly ruleSetRedisRepo: HeaderManipulationSetRedisRepository,
    ) {
    }

    async create(entities: internal.HeaderRule[], sr: ServiceRequest): Promise<internal.HeaderRule[]> {
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

        await this.assignSubscriberSets(entities, sr)

        this.invalidateRuleSetsAfterCommit(entities.map(entity => entity.setId), sr)

        const createdIds = await this.ruleRepo.create(entities)

        return await this.ruleRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.HeaderRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filters.showSubscriberRules = true

        return await this.ruleRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.HeaderRule> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filters.showSubscriberRules = true

        return await this.ruleRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.HeaderRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let rules: internal.HeaderRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, rules.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        this.invalidateRuleSetsAfterCommit(rules.map(rule => rule.setId), sr)

        return await this.ruleRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let rules: internal.HeaderRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, rules.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const setIds = rules.map(rule => rule.setId)
        const sets = (await this.ruleSetRepo.readWhereInIds(setIds, sr)).filter(set => set.subscriberId)
        const deletedIds = await this.ruleRepo.delete(ids, sr)
        const setIdsWithRules = new Set(await this.ruleRepo.readSetIdsWithRules(sets.map(set => set.id)))
        const deleteSetIds = sets.map(set => set.id).filter(id => !setIdsWithRules.has(id))

        this.invalidateRuleSetsAfterCommit(setIds, sr)
        if (deleteSetIds.length > 0)
            await this.ruleSetRepo.delete(deleteSetIds, sr)

        return deletedIds
    }

    // rules of a subscriber go to its set, a missing set is created
    private async assignSubscriberSets(entities: internal.HeaderRule[], sr: ServiceRequest): Promise<void> {
        const subscriberIds = [...new Set(entities.filter(entity => entity.subscriberId).map(entity => entity.subscriberId))]
        const setIds = await this.ruleSetRepo.readIdsBySubscriberIds(subscriberIds)
        const withoutSet = subscriberIds.filter(id => !setIds.has(id))
        if (withoutSet.length) {
            const newSets = withoutSet.map(subscriberId => Object.assign(new internal.HeaderRuleSet(), {
                resellerId: sr.user.reseller_id,
                subscriberId,
                name: `subscriber_${subscriberId}`,
            }))
            const createdIds = await this.ruleSetRepo.create(newSets)
            for (const [index, subscriberId] of withoutSet.entries())
                setIds.set(subscriberId, createdIds[index])
        }
        for (const entity of entities.filter(entity => entity.subscriberId))
            entity.setId = setIds.get(entity.subscriberId)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['setId']) {
            filterBy.setId = +sr.params['setId']
        }
        return filterBy
    }

    private invalidateRuleSetsAfterCommit(setIds: number[], sr: ServiceRequest): void {
        for (const setId of new Set(setIds))
            runOnTransactionCommit(async () => await this.ruleSetRedisRepo.invalidateRuleSet(setId, sr))
    }
}
