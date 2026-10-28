import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {GenerateErrorMessageArray} from 'helpers/http-error.helper'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, HeaderManipulationSetMariadbRepository} from './repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from './repositories/set.redis.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {runOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'



@Injectable()
export class HeaderManipulationSetService implements CrudService<internal.HeaderRuleSet> {
    private readonly log = new LoggerService(HeaderManipulationSetService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
        @Inject (HeaderManipulationSetRedisRepository) private readonly ruleSetRedisRepo: HeaderManipulationSetRedisRepository,
    ) {
    }

    async create(entities: internal.HeaderRuleSet[], sr: ServiceRequest): Promise<internal.HeaderRuleSet[]> {
        this.assignUserResellerId(entities, sr)
        const createdIds = await this.ruleSetRepo.create(entities)
        return await this.ruleSetRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleSet[], number]> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filters.showSubscriberSets = true

        return await this.ruleSetRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleSet> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        if (sr.query.subscriber_id)
            filters.showSubscriberSets = true

        return await this.ruleSetRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.HeaderRuleSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let sets: internal.HeaderRuleSet[]
        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        if (sets.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != sets.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        this.assignUserResellerId(Object.values(updates), sr)
        return await this.ruleSetRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let sets: internal.HeaderRuleSet[]

        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        if (sets.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != sets.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        ids.forEach(async setId => await this.invalidateRuleSetAfterCommit(setId, sr))

        return await this.ruleSetRepo.delete(ids, sr)
    }

    private assignUserResellerId(entities: internal.HeaderRuleSet[], sr: ServiceRequest): void {
        if (!sr.user.reseller_id_required)
            return
        for (const entity of entities)
            entity.resellerId = sr.user.reseller_id
    }

    // TODO: required for mocking, as esbuild-jest has issues with jest mock
    // patterns and will be reviewed after packages upgrade
    async invalidateRuleSetAfterCommit(setId: number, sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => await this.ruleSetRedisRepo.invalidateRuleSet(setId, sr))
    }
}
