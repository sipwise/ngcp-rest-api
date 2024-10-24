import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../../../entities'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {FilterBy, HeaderManipulationRuleMariadbRepository} from './repositories/header-manipulation-rule.mariadb.repository'
import {CrudService} from '../../../../interfaces/crud-service.interface'
import {LoggerService} from '../../../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {Dictionary} from '../../../../helpers/dictionary.helper'
import {ErrorMessage} from '../../../../interfaces/error-message.interface'
import {GenerateErrorMessageArray} from '../../../../helpers/http-error.helper'
import {HeaderManipulationSetMariadbRepository} from '../repositories/header-manipulation-set.mariadb.repository'

@Injectable()
export class HeaderManipulationRuleService implements CrudService<internal.HeaderRule> {
    private readonly log = new LoggerService(HeaderManipulationRuleService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationRuleMariadbRepository) private readonly ruleRepo: HeaderManipulationRuleMariadbRepository,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
    ) {
    }

    async create(entities: internal.HeaderRule[], sr: ServiceRequest): Promise<internal.HeaderRule[]> {
        if (sr.user.reseller_id_required) {
            const sets = await this.ruleSetRepo.readWhereInIds(entities.map(entity => entity.setId), sr)
            if (sets.some(set => set.resellerId != sr.user.reseller_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        for (const entity of entities) {
            if (entity.subscriberId) {
                const sets = await this.ruleSetRepo.readBySubscriberId(entity.subscriberId, sr)
                if (sets.length == 0) {
                    const newEntity = new internal.HeaderRuleSet()
                    newEntity.id = entity.setId
                    newEntity.resellerId = sr.user.reseller_id
                    newEntity.subscriberId = entity.subscriberId
                    newEntity.name = `subscriber_${entity.subscriberId}`
                    const newSets = await this.ruleSetRepo.create([newEntity])
                    entity.setId = newSets[0].id
                } else {
                    entity.setId = sets[0].id
                }
            }
        }

        return await this.ruleRepo.create(entities)
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

        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.ruleRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let rules: internal.HeaderRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const setIds = rules.map(rule => rule.setId)
        const sets = (await this.ruleSetRepo.readWhereInIds(setIds, sr)).filter(set => set.subscriberId)
        const deletedIds = await this.ruleRepo.delete(ids, sr)
        const deleteSetIds = []
        for (const set of sets) {
            const count = await this.ruleRepo.readCountInSet(set.id, sr)
            if (count == 0) {
                deleteSetIds.push(set.id)
            }
        }

        if (deleteSetIds.length > 0) {
            await this.ruleSetRepo.delete(deleteSetIds, sr)
        }

        return deletedIds
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['setId']) {
            filterBy.setId = +sr.params['setId']
        }
        return filterBy
    }
}
