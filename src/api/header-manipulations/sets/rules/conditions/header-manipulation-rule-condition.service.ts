import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../../../../entities'
import {ServiceRequest} from '../../../../../interfaces/service-request.interface'
import {FilterBy, HeaderManipulationRuleConditionMariadbRepository} from './repositories/header-manipulation-rule-condition.mariadb.repository'
import {CrudService} from '../../../../../interfaces/crud-service.interface'
import {LoggerService} from '../../../../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {Dictionary} from '../../../../../helpers/dictionary.helper'
import {HeaderManipulationRuleMariadbRepository} from '../repositories/header-manipulation-rule.mariadb.repository'
import {HeaderManipulationSetMariadbRepository} from '../../repositories/header-manipulation-set.mariadb.repository'
import {ErrorMessage} from '../../../../../interfaces/error-message.interface'
import {GenerateErrorMessageArray} from '../../../../../helpers/http-error.helper'

@Injectable()
export class HeaderManipulationRuleConditionService implements CrudService<internal.HeaderRuleCondition> {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationRuleConditionMariadbRepository) private readonly ruleConditionRepo: HeaderManipulationRuleConditionMariadbRepository,
        @Inject(HeaderManipulationRuleMariadbRepository) private readonly ruleRepo: HeaderManipulationRuleMariadbRepository,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
    ) {
    }

    async create(entities: internal.HeaderRuleCondition[], sr: ServiceRequest): Promise<internal.HeaderRuleCondition[]> {
        if (sr.user.reseller_id_required) {
            const rules = await this.ruleRepo.readWhereInIds(entities.map(entity => entity.ruleId), sr)
            const sets = await this.ruleSetRepo.readWhereInIds(rules.map(rule => rule.setId), sr)
            if (sets.some(set => set.resellerId != sr.user.reseller_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        return await this.ruleConditionRepo.create(entities)
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

        if (conditions.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != conditions.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

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

        if (conditions.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != conditions.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

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
}
