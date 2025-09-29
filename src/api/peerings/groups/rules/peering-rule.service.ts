

import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {FilterBy, PeeringRuleMariadbRepository} from './repositories/peering-rule.mariadb.repository'
import {PeeringRuleRedisRepository} from './repositories/peering-rule.redis.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringRuleService implements CrudService<internal.VoipPeeringRule> {
    private readonly log = new LoggerService(PeeringRuleService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringRuleMariadbRepository) private readonly ruleRepo: PeeringRuleMariadbRepository,
        @Inject(PeeringRuleRedisRepository) private readonly ruleRedisRepo: PeeringRuleRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringRule[], sr: ServiceRequest): Promise<internal.VoipPeeringRule[]> {
        const created = await this.ruleRepo.create(entities)
        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(entities)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        return this.ruleRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.ruleRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringRule> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.ruleRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.VoipPeeringRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const servers = await this.ruleRepo.readWhereInIds(ids, sr)

        if (servers.length == 0) {
            throw new NotFoundException()
        }

        if (ids.length != servers.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        // Always reload LCR
        await this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReloadOnUpdate(servers, updates)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        return this.ruleRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const servers = await this.ruleRepo.readWhereInIds(ids, sr)
        if (servers.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != servers.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(servers)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
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

    private requiresDispatcherReloadOnUpdate(oldRules: internal.VoipPeeringRule[], updates: Dictionary<internal.VoipPeeringRule>): boolean {
        return oldRules.some(rule => {
            const updated = updates[rule.id]
            if (!updated) return false
            return rule.enabled !== updated.enabled
        })
    }

    private requiresDispatcherReload(rules: internal.VoipPeeringRule[]): boolean {
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
