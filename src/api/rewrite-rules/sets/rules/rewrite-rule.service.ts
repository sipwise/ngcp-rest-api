
import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {FilterBy, RewriteRuleMariadbRepository} from './repositories/rewrite-rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './repositories/rewrite-rule.redis.repository'

import {RewriteRuleSetMariadbRepository} from '~/api/rewrite-rules/sets/repositories/rewrite-rule-set.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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
            if (sets.some(set => set.resellerId != sr.user.reseller_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
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
        }

        const createdIds = await this.ruleRepo.create(entities)

        await this.reloadDialPlanAfterCommit(sr)

        return await this.ruleRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.RewriteRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.RewriteRule> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.RewriteRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let rules: internal.RewriteRule[]
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

        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

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
}
