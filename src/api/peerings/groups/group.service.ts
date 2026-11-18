

import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {PeeringGroupMariadbRepository} from './repositories/group.mariadb.repository'
import {PeeringGroupRedisRepository} from './repositories/group.redis.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {apiError, checkItems, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringGroupService implements CrudService<internal.VoipPeeringGroup> {
    private readonly log = new LoggerService(PeeringGroupService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringGroupMariadbRepository) private readonly peeringGroupRepo: PeeringGroupMariadbRepository,
        @Inject (PeeringGroupRedisRepository) private readonly peeringGroupRedisRepo: PeeringGroupRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringGroup[], sr: ServiceRequest): Promise<internal.VoipPeeringGroup[]> {
        const contractIds = new Set(await this.peeringGroupRepo.readPeeringContractIds(entities.map(entity => entity.peeringContractId)))
        await checkItems(entities, (entity, key) => this.validateContract(entity, contractIds, sr, key))
        const created = await this.peeringGroupRepo.create(entities)
        return this.peeringGroupRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringGroup[], number]> {
        return await this.peeringGroupRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringGroup> {
        return await this.peeringGroupRepo.readById(id, sr)
    }

    async update(updates: Dictionary<internal.VoipPeeringGroup>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const groups = await this.peeringGroupRepo.readWhereInIds(ids, sr)

        throwMissingIds(sr, ids, groups.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const oldContractIds = new Map(groups.map(group => [group.id, group.peeringContractId]))
        const contractIds = new Set(await this.peeringGroupRepo.readPeeringContractIds(Object.values(updates).map(group => group.peeringContractId)))
        await checkItems(updates, (group, key) => {
            if (group.peeringContractId != oldContractIds.get(+key))
                this.validateContract(group, contractIds, sr, key)
        })

        return await this.peeringGroupRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const groups = await this.peeringGroupRepo.readWhereInIds(ids, sr)
        throwMissingIds(sr, ids, groups.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const reloadKamailioRequired = await this.peeringGroupRepo.hasEnabledOrProbedServerInGroups(ids, sr)
        if (reloadKamailioRequired) {
            this.reloadKamProxyAfterCommit(sr)
        }

        return await this.peeringGroupRepo.delete(ids, sr)
    }

    private validateContract(group: internal.VoipPeeringGroup, peeringContractIds: Set<number>, sr: ServiceRequest, key: number | string): void {
        if (!peeringContractIds.has(group.peeringContractId))
            throw apiError(this.i18n.t('errors.PEERING_CONTRACT_INVALID'), itemPointer(sr, key, group, 'peeringContractId'))
    }

    reloadKamProxyAfterCommit(sr: ServiceRequest): void {
        runOnTransactionCommit(async () => {
            await this.peeringGroupRedisRepo.reloadKamProxLcr(sr)
            await this.peeringGroupRedisRepo.reloadKamProxDispatcher(sr)
        })
    }
}
