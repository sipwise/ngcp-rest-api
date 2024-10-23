import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {FilterBy, HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'
import {CrudService} from '~/interfaces/crud-service.interface'
import {LoggerService} from '~/logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from 'helpers/http-error.helper'
import {ErrorMessage} from '~/interfaces/error-message.interface'

@Injectable()
export class HeaderManipulationSetService implements CrudService<internal.HeaderRuleSet> {
    private readonly log = new LoggerService(HeaderManipulationSetService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(HeaderManipulationSetMariadbRepository) private readonly ruleSetRepo: HeaderManipulationSetMariadbRepository,
    ) {
    }

    async create(entities: internal.HeaderRuleSet[], sr: ServiceRequest): Promise<internal.HeaderRuleSet[]> {
        await Promise.all(entities.map(async entity => {
            if (!entity.resellerId)
                entity.resellerId = sr.user.reseller_id

            if (sr.user.reseller_id_required)
                await this.checkPermissions(entity.resellerId, sr)
        }))
        return await this.ruleSetRepo.create(entities)
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

        return await this.ruleSetRepo.delete(ids, sr)
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }
}
