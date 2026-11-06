import {HttpStatus, Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {apiError, checkItems, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'



@Injectable()
export class ResellerService implements CrudService<internal.Reseller> {
    private readonly log = new LoggerService(ResellerService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ResellerMariadbRepository) private readonly resellerRepo: ResellerMariadbRepository,
    ) {
    }

    async create(resellers: internal.Reseller[], sr: ServiceRequest): Promise<internal.Reseller[]> {
        await checkItems(resellers, async (reseller, key) => {
            await this.validateContract(reseller, sr, key)
            const existingReseller = await this.resellerRepo.readByName(reseller.name, sr)
            if (existingReseller != undefined && existingReseller.status != ResellerStatus.Terminated)
                throw apiError(this.i18n.t('errors.NAME_EXISTS', {args: {name: existingReseller.name}}), itemPointer(sr, key, reseller, 'name'))
        })
        // a terminated reseller of the same name is renamed
        for (const reseller of resellers) {
            const existingReseller = await this.resellerRepo.readByName(reseller.name, sr)
            if (existingReseller != undefined)
                await this.resellerRepo.renameReseller(existingReseller.id, existingReseller.name)
        }
        const createdIds = await this.resellerRepo.create(resellers, sr)
        await this.resellerRepo.createEmailTemplates(createdIds)

        return await this.resellerRepo.readWhereInIds(createdIds)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'read reseller by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.resellerRepo.read(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]> {
        this.log.debug({
            message: 'read all resellers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.resellerRepo.readAll(sr)
    }

    async update(updates: Dictionary<internal.Reseller>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const resellers = await this.resellerRepo.readWhereInIds(ids)
        throwMissingIds(sr, ids, resellers.map(reseller => reseller.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        this.log.debug({message: 'update reseller by ids', func: this.update.name, user: sr.user.username, ids: ids})
        await checkItems(updates, async (reseller, key) => {
            const oldReseller = await this.resellerRepo.read(+key, sr)
            await this.validateUpdate(oldReseller, reseller, sr, key)
        })
        return await this.resellerRepo.update(updates, sr)
    }

    private async validateUpdate(oldReseller: internal.Reseller, newReseller: internal.Reseller, sr: ServiceRequest, key: number | string): Promise<void> {
        if (sr.user.reseller_id_required && sr.user.reseller_id != newReseller.id)
            throw apiError(this.i18n.t('errors.RESELLER_CHANGE_UNASSOCIATED_FORBIDDEN'), itemPointer(sr, key), HttpStatus.FORBIDDEN)
        if (oldReseller.contract_id != newReseller.contract_id)
            await this.validateContract(newReseller, sr, key)
        if (oldReseller.name != newReseller.name && await this.resellerRepo.readByName(newReseller.name, sr) != undefined)
            throw apiError(this.i18n.t('errors.RESELLER_NAME_EXISTS'), itemPointer(sr, key, newReseller, 'name'))
    }

    private async validateContract(reseller: internal.Reseller, sr: ServiceRequest, key: number | string): Promise<void> {
        const pointer = itemPointer(sr, key, reseller, 'contract_id')
        if (!await this.resellerRepo.contractExists(reseller.contract_id))
            throw apiError(this.i18n.t('errors.CONTRACT_NOT_FOUND'), pointer)
        if (await this.resellerRepo.resellerWithContractExists(reseller.contract_id))
            throw apiError(this.i18n.t('errors.RESELLER_CONTRACT_EXISTS'), pointer)
        if (!await this.resellerRepo.contractHasSystemContact(reseller.contract_id))
            throw apiError(this.i18n.t('errors.CONTACT_CONTRACT_INVALID_LINK'), pointer)
    }
}
