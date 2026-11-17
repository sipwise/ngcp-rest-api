

import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {In} from 'typeorm'

import {PeeringGroupMariadbRepository} from './repositories/peering-inbound-rule.mariadb.repository'
import {PeeringGroupRedisRepository} from './repositories/peering-inbound-rule.redis.repository'

import {db, internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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
        await this.validateContracts(entities)
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

        if (groups.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != groups.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const oldContractIds = new Map(groups.map(group => [group.id, group.peeringContractId]))
        await this.validateContracts(Object.keys(updates)
            .filter(id => updates[id].peeringContractId != oldContractIds.get(+id))
            .map(id => updates[id]))

        return await this.peeringGroupRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const groups = await this.peeringGroupRepo.readWhereInIds(ids, sr)
        if (groups.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != groups.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const reloadKamailioRequired = await this.peeringGroupRepo.hasEnabledOrProbedServerInGroups(ids, sr)
        if (reloadKamailioRequired) {
            await this.reloadKamProxyAfterCommit(sr)
        }

        return await this.peeringGroupRepo.delete(ids, sr)
    }

    private async validateContracts(groups: internal.VoipPeeringGroup[]): Promise<void> {
        if (!groups.length)
            return
        const contractIds = groups.map(group => group.peeringContractId).filter(id => id != null)
        const contracts = contractIds.length ? await db.billing.Contract.find({
            where: {
                id: In(contractIds),
                product: {class: In([
                    ProductClass.PstnPeering,
                    ProductClass.SipPeering,
                ])},
            },
        }) : []
        const validIds = new Set(contracts.map(contract => contract.id))
        if (groups.some(group => !validIds.has(group.peeringContractId)))
            throw new UnprocessableEntityException(this.i18n.t('errors.PEERING_CONTRACT_INVALID'))
    }

    async reloadKamProxyAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.peeringGroupRedisRepo.reloadKamProxLcr(sr)
            await this.peeringGroupRedisRepo.reloadKamProxDispatcher(sr)
        })
    }
}
