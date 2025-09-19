

import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {In} from 'typeorm'
import {runOnTransactionCommit} from 'typeorm-transactional'

import {PeeringGroupMariadbRepository} from './repositories/peering-group.mariadb.repository'
import {PeeringGroupRedisRepository} from './repositories/peering-group.redis.repository'

import {db, internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
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
        const contractIds = entities.map(e => e.peeringContractId)
        const contracts = await db.billing.Contract.find({
            where: {
                id: In(contractIds),
                product: {class: In([
                    ProductClass.PstnPeering,
                    ProductClass.SipPeering,
                ])},
            },
        })
        const validIds = new Set(contracts.map(c => c.id))
        const missing = entities.filter(e => !validIds.has(e.peeringContractId))
        if (missing.length > 0) {
            throw new NotFoundException()
        }
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

        // check if contract exists
        const contractIds = groups.map(g => g.peeringContractId)
        const contracts = await db.billing.Contract.find({
            where: {
                id: In(contractIds),
                product: {class: In([
                    ProductClass.PstnPeering,
                    ProductClass.SipPeering,
                ])},
            },
        })
        const validIds = new Set(contracts.map(c => c.id))
        const missing = groups.filter(g => !validIds.has(g.peeringContractId))
        if (missing.length > 0) {
            throw new NotFoundException()
        }

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

    async reloadKamProxyAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.peeringGroupRedisRepo.reloadKamProxLcr(sr)
            await this.peeringGroupRedisRepo.reloadKamProxDispatcher(sr)
        })
    }
}
