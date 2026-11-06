

import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, PeeringGroupServerMariadbRepository} from './repositories/server.mariadb.repository'
import {PeeringGroupServerRedisRepository} from './repositories/server.redis.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
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
        this.checkSiteIds(entities, sr)

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

        throwMissingIds(sr, ids, servers.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        this.checkSiteIds(updates, sr)

        // Always reload LCR
        await this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReloadOnUpdate(servers, updates)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        return this.peeringGroupServerRepo.update(updates, sr)
    }

    private checkSiteIds(entities: internal.VoipPeeringServer[] | Dictionary<internal.VoipPeeringServer>, sr: ServiceRequest): void {
        const errors = new ApiErrors()
        for (const [key, entity] of Object.entries(entities)) {
            if (entity.siteId && !this.validateSiteId(entity.siteId))
                errors.add(this.i18n.t('errors.INVALID_SITE_ID'), itemPointer(sr, key, entity, 'siteId'))
        }
        errors.throwIfAny()
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const servers = await this.peeringGroupServerRepo.readWhereInIds(ids, sr)
        throwMissingIds(sr, ids, servers.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

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
            return server.enabled !== updated.enabled || server.probe !== updated.probe || server.transport !== updated.transport
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
