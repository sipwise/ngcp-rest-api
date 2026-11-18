import {HttpStatus, Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ResellerContract} from './interfaces/reseller.repository'
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
        const contracts = await this.readContracts(resellers.map(reseller => reseller.contract_id))
        const existing = await this.readByNames(resellers.map(reseller => reseller.name))
        await checkItems(resellers, (reseller, key) => {
            this.validateContract(reseller, contracts, sr, key)
            const existingReseller = existing.get(reseller.name.toLowerCase())
            if (existingReseller != undefined && existingReseller.status != ResellerStatus.Terminated)
                throw apiError(this.i18n.t('errors.NAME_EXISTS', {args: {name: existingReseller.name}}), itemPointer(sr, key, reseller, 'name'))
        })
        // a terminated reseller of the same name is renamed
        if (existing.size)
            await this.resellerRepo.renameResellers([...existing.values()].map(reseller => reseller.id))
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
        const oldResellers = new Map(resellers.map(reseller => [reseller.id, reseller]))
        const contractChanges = ids.filter(id => updates[id].contract_id != oldResellers.get(id).contract_id)
        const nameChanges = ids.filter(id => updates[id].name != oldResellers.get(id).name)
        const contracts = await this.readContracts(contractChanges.map(id => updates[id].contract_id))
        const existing = await this.readByNames(nameChanges.map(id => updates[id].name))
        await checkItems(updates, (reseller, key) => {
            const oldReseller = oldResellers.get(+key)
            if (sr.user.reseller_id_required && sr.user.reseller_id != reseller.id)
                throw apiError(this.i18n.t('errors.RESELLER_CHANGE_UNASSOCIATED_FORBIDDEN'), itemPointer(sr, key), HttpStatus.FORBIDDEN)
            if (oldReseller.contract_id != reseller.contract_id)
                this.validateContract(reseller, contracts, sr, key)
            if (oldReseller.name != reseller.name && existing.has(reseller.name.toLowerCase()))
                throw apiError(this.i18n.t('errors.RESELLER_NAME_EXISTS'), itemPointer(sr, key, reseller, 'name'))
        })
        return await this.resellerRepo.update(updates, sr)
    }

    private async readContracts(contractIds: number[]): Promise<Map<number, ResellerContract>> {
        const contracts = await this.resellerRepo.readResellerContracts([...new Set(contractIds)])
        return new Map(contracts.map(contract => [contract.id, contract]))
    }

    // resellers by lowercase name, names compare case-insensitively as in the db
    private async readByNames(names: string[]): Promise<Map<string, internal.Reseller>> {
        const resellers = await this.resellerRepo.readByNames([...new Set(names)])
        return new Map(resellers.map(reseller => [reseller.name.toLowerCase(), reseller]))
    }

    private validateContract(reseller: internal.Reseller, contracts: Map<number, ResellerContract>, sr: ServiceRequest, key: number | string): void {
        const pointer = itemPointer(sr, key, reseller, 'contract_id')
        const contract = contracts.get(reseller.contract_id)
        if (!contract)
            throw apiError(this.i18n.t('errors.CONTRACT_NOT_FOUND'), pointer)
        if (contract.hasReseller)
            throw apiError(this.i18n.t('errors.RESELLER_CONTRACT_EXISTS'), pointer)
        if (!contract.hasSystemContact)
            throw apiError(this.i18n.t('errors.CONTACT_CONTRACT_INVALID_LINK'), pointer)
    }
}
