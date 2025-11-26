import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {FilterBy, HeaderManipulationRuleActionMariadbRepository} from './repositories/header-manipulation-rule-action.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.redis.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/header-manipulation-rule.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class HeaderManipulationRuleActionService implements CrudService<internal.HeaderRuleAction> {
    private readonly log = new LoggerService(HeaderManipulationRuleActionService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationRuleActionMariadbRepository) private readonly ruleActionRepo: HeaderManipulationRuleActionMariadbRepository,
        @Inject(HeaderManipulationRuleMariadbRepository) private readonly ruleRepo: HeaderManipulationRuleMariadbRepository,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
        @Inject(HeaderManipulationSetRedisRepository) private readonly ruleSetRedisRepo: HeaderManipulationSetRedisRepository,
    ) {
    }

    async create(entities: internal.HeaderRuleAction[], sr: ServiceRequest): Promise<internal.HeaderRuleAction[]> {
        const rules = await this.ruleRepo.readWhereInIds(entities.map(entity => entity.ruleId), sr)
        if (sr.user.reseller_id_required) {
            const sets = await this.ruleSetRepo.readWhereInIds(rules.map(rule => rule.setId), sr)
            if (sets.some(set => set.resellerId != sr.user.reseller_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

        const createdIds = await this.ruleActionRepo.create(entities)
        return await this.ruleActionRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleAction[], number]> {
        const filterBy: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberActions = true

        return await this.ruleActionRepo.readAll(sr, filterBy)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleAction> {
        const filterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filterBy.showSubscriberActions = true

        return await this.ruleActionRepo.readById(id, sr, filterBy)
    }

    async update(updates: Dictionary<internal.HeaderRuleAction>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        let actions: internal.HeaderRuleAction[]
        if (sr.user.reseller_id_required) {
            actions = await this.ruleActionRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            actions = await this.ruleActionRepo.readWhereInIds(ids, sr)
        }

        if (actions.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != actions.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const rules = await this.ruleRepo.readWhereInIds(actions.map(action => action.ruleId), sr)

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

        return await this.ruleActionRepo.update(updates, sr)
    }

    async recreate(updates: Dictionary<internal.HeaderRuleAction>, sr: ServiceRequest): Promise<number[]> {
        await this.delete(Object.keys(updates).map(id => parseInt(id)), sr)
        const created = await this.create(Object.values(updates), sr)
        return Promise.resolve(created.map(action => action.id))
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let actions: internal.HeaderRuleAction[]
        if (sr.user.reseller_id_required) {
            actions = await this.ruleActionRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            actions = await this.ruleActionRepo.readWhereInIds(ids, sr)
        }

        if (actions.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != actions.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const rules = await this.ruleRepo.readWhereInIds(actions.map(action => action.ruleId), sr)

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

        return await this.ruleActionRepo.delete(ids,sr)
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
