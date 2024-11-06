import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {GenerateErrorMessageArray} from 'helpers/http-error.helper'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, RewriteRuleSetMariadbRepository} from './repositories/rewrite-rule-set.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class RewriteRuleSetService implements CrudService<internal.RewriteRuleSet> {
    private readonly log = new LoggerService(RewriteRuleSetService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (RewriteRuleSetMariadbRepository) private readonly ruleSetRepo: RewriteRuleSetMariadbRepository,
    ) {
    }

    async create(entities: internal.RewriteRuleSet[], sr: ServiceRequest): Promise<internal.RewriteRuleSet[]> {
        await Promise.all(entities.map(async entity => {
            if (!entity.resellerId)
                entity.resellerId = sr.user.reseller_id

            if (sr.user.reseller_id_required)
                await this.checkPermissions(entity.resellerId, sr)
        }))
        const created = await this.ruleSetRepo.create(entities)
        return await this.ruleSetRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.RewriteRuleSet[], number]> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleSetRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.RewriteRuleSet> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleSetRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.RewriteRuleSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let sets: internal.RewriteRuleSet[]
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
        let sets: internal.RewriteRuleSet[]

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
