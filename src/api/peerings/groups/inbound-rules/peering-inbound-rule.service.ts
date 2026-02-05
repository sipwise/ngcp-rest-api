import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {FilterBy, PeeringInboundRuleMariadbRepository} from './repositories/peering-inbound-rule.mariadb.repository'
import {PeeringInboundRuleRedisRepository} from './repositories/peering-inbound-rule.redis.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringInboundRuleService implements CrudService<internal.VoipPeeringInboundRule> {
    private readonly log = new LoggerService(PeeringInboundRuleService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringInboundRuleMariadbRepository) private readonly ruleRepo: PeeringInboundRuleMariadbRepository,
        @Inject(PeeringInboundRuleRedisRepository) private readonly ruleRedisRepo: PeeringInboundRuleRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringInboundRule[], sr: ServiceRequest): Promise<internal.VoipPeeringInboundRule[]> {
        const created = await this.ruleRepo.create(entities)
        await Promise.all(entities.map(async entity => {
            this.ruleRepo.increaseGroupInboundRulesCount(entity.groupId)
        }))
        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(entities)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        return this.ruleRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringInboundRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.ruleRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringInboundRule> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.ruleRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.VoipPeeringInboundRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const rules = await this.ruleRepo.readWhereInIds(ids, sr)

        if (rules.length == 0) {
            throw new NotFoundException()
        }

        if (ids.length != rules.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        // Always reload LCR
        await this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReloadOnUpdate(rules, updates)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        return this.ruleRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const rules = await this.ruleRepo.readWhereInIds(ids, sr)
        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(rules)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        await Promise.all(rules.map(async rule => {
            this.ruleRepo.decreaseGroupInboundRulesCount(rule.groupId)
        }))
        return await this.ruleRepo.delete(ids, sr)
    }

    async reloadKamProxyLcrAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.ruleRedisRepo.reloadKamProxLcr(sr)
        })
    }

    async reloadKamProxyDispatcherAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.ruleRedisRepo.reloadKamProxDispatcher(sr)
        })
    }

    private requiresDispatcherReloadOnUpdate(oldRules: internal.VoipPeeringInboundRule[], updates: Dictionary<internal.VoipPeeringInboundRule>): boolean {
        return oldRules.some(rule => {
            const updated = updates[rule.id]
            if (!updated) return false
            return rule.enabled !== updated.enabled
        })
    }

    private requiresDispatcherReload(rules: internal.VoipPeeringInboundRule[]): boolean {
        return rules.some(rule => rule.enabled)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['groupId']) {
            filterBy.group_id = +sr.params['groupId']
        }
        return filterBy
    }
}
