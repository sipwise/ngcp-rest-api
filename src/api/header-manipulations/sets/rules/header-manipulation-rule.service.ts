import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {FilterBy, HeaderManipulationRuleMariadbRepository} from './repositories/header-manipulation-rule.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.redis.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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
                    entity.setId = (await this.ruleSetRepo.create([newEntity]))[0]
                } else {
                    entity.setId = sets[0].id
                }
            }
        }

        entities.forEach(async entity => await this.invalidateRuleSetAfterCommit(entity.setId, sr))

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

        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        rules.forEach(async rule => await this.invalidateRuleSetAfterCommit(rule.setId, sr))

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
            setIds.forEach(async setId => await this.invalidateRuleSetAfterCommit(setId, sr))
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

    // TODO: required for mocking, as esbuild-jest has issues with jest mock
    // patterns and will be reviewed after packages upgrade
    async invalidateRuleSetAfterCommit(setId: number, sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => await this.ruleSetRedisRepo.invalidateRuleSet(setId, sr))
    }
}
