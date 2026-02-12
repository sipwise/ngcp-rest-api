

import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {FilterBy, PeeringGroupServerMariadbRepository} from './repositories/peering-group-server.mariadb.repository'
import {PeeringGroupServerRedisRepository} from './repositories/peering-group-server.redis.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringGroupServerService implements CrudService<internal.VoipPeeringServer> {
    private readonly log = new LoggerService(PeeringGroupServerService.name)

    constructor(
        private readonly app: AppService,
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringGroupServerMariadbRepository) private readonly peeringGroupServerRepo: PeeringGroupServerMariadbRepository,
        @Inject(PeeringGroupServerRedisRepository) private readonly serverRedisRepo: PeeringGroupServerRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringServer[], sr: ServiceRequest): Promise<internal.VoipPeeringServer[]> {
        const invalidEntries = await Promise.all(entities.map(async (entity) => {
            if (!entity.siteId)
                return
            if (!this.validateSiteId(entity.siteId))
                return entity.id
        }))

        if (invalidEntries.length) {
            const error: ErrorMessage = this.i18n.t('errors.INVALID_SITE_ID')
            const message = GenerateErrorMessageArray(invalidEntries, error.message)
            throw new UnprocessableEntityException(message)
        }

        const created = await this.peeringGroupServerRepo.create(entities)
        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(entities)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        return this.peeringGroupServerRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringServer[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.peeringGroupServerRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringServer> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.peeringGroupServerRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.VoipPeeringServer>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const servers = await this.peeringGroupServerRepo.readWhereInIds(ids, sr)

        if (servers.length == 0) {
            throw new NotFoundException()
        }

        if (ids.length != servers.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const invalidIds: number[] = []
        await Promise.all(Object.values(updates).map(async (update) => {
            if (!update.siteId)
                return
            if (!this.validateSiteId(update.siteId))
                invalidIds.push(update.id)
        }))

        if (invalidIds.length) {
            const error: ErrorMessage = this.i18n.t('errors.INVALID_SITE_ID')
            const message = GenerateErrorMessageArray(invalidIds, error.message)
            throw new UnprocessableEntityException(message)
        }

        // Always reload LCR
        await this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReloadOnUpdate(servers, updates)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        return this.peeringGroupServerRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const servers = await this.peeringGroupServerRepo.readWhereInIds(ids, sr)
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
        return await this.peeringGroupServerRepo.delete(ids, sr)
    }

    async reloadKamProxyLcrAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.serverRedisRepo.reloadKamProxLcr(sr)
        })
    }

    async reloadKamProxyDispatcherAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.serverRedisRepo.reloadKamProxDispatcher(sr)
        })
    }

    private requiresDispatcherReloadOnUpdate(oldServers: internal.VoipPeeringServer[], updates: Dictionary<internal.VoipPeeringServer>): boolean {
        return oldServers.some(server => {
            const updated = updates[server.id]
            if (!updated) return false
            return server.enabled !== updated.enabled || server.probe !== updated.probe
        })
    }

    private requiresDispatcherReload(servers: internal.VoipPeeringServer[]): boolean {
        return servers.some(server => server.enabled && server.probe)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['groupId']) {
            filterBy.group_id = +sr.params['groupId']
        }
        return filterBy
    }

    private validateSiteId(siteId: number): boolean {
        const sites = this.app.config.multisite.sites ?? {}
        return Object.keys(sites).includes(siteId.toString())
    }
}
