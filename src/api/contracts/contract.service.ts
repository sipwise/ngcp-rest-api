import {Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ContractMariadbRepository} from './repositories/contract.mariadb.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContractType} from '~/entities/internal/contract.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'



@Injectable()
export class ContractService implements CrudService<internal.Contract> {
    private readonly log = new LoggerService(ContractService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ContractMariadbRepository) private readonly contractsRepo: ContractMariadbRepository,
    ) {
    }

    async create(contracts: internal.Contract[], sr: ServiceRequest): Promise<internal.Contract[]> {
        const now = new Date(Date.now())
        for (const contract of contracts) {
            await this.validateSystemContact(contract, sr)
            await this.setProductId(contract, sr)
            await this.validateBillingProfile(contract, sr)
            contract.create_timestamp = now
            contract.modify_timestamp = now
        }
        const createdIds = await this.contractsRepo.create(contracts, sr)
        for (const [index, id] of createdIds.entries()) {
            await this.contractsRepo.appendBillingMappings(id, [
                internal.BillingMapping.create({billingProfileId: contracts[index].billing_profile_id}),
            ], sr)
        }
        return await this.contractsRepo.readWhereInIds(createdIds, sr)
    }

    private async setProductId(contract: internal.Contract, sr: ServiceRequest): Promise<void> {
        const product = await this.contractsRepo.readProductByType(contract.type, sr)
        if (product == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.TYPE_INVALID'))
        }
        contract.product_id = product.id
    }

    // as v1 'id' mode; the contact is a system contact, so the profile's reseller isn't checked
    private async validateBillingProfile(contract: internal.Contract, sr: ServiceRequest): Promise<void> {
        const profile = await this.contractsRepo.readBillingProfile(contract.billing_profile_id, sr)
        if (profile == undefined)
            throw new UnprocessableEntityException(this.i18n.t('errors.INVALID_BILLING_PROFILE_ID'))
        if (profile.status == BillingProfileStatus.Terminated)
            throw new UnprocessableEntityException(this.i18n.t('errors.BILLING_PROFILE_ALREADY_TERMINATED'))
        if (profile.prepaid && [ContractType.SipPeering, ContractType.Reseller].includes(contract.type))
            throw new UnprocessableEntityException(this.i18n.t('errors.PEERING_RESELLER_CONTRACT_PREPAID_PROFILE'))
    }

    private async validateSystemContact(contract: internal.Contract, sr: ServiceRequest): Promise<void> {
        const systemContact = await this.contractsRepo.readActiveSystemContact(contract.contact_id, sr)
        if (systemContact == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_ID_INVALID'))
        }
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({message: 'read contract by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.contractsRepo.read(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        this.log.debug({message: 'read all contracts', func: this.read.name, user: sr.user.username})
        return await this.contractsRepo.readAll(sr)
    }

    async update(updates: Dictionary<internal.Contract>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        this.log.debug({message: 'update contract by ids', func: this.read.name, user: sr.user.username, ids: ids})
        const now = new Date()
        const profileChanges = new Map<number, number>()
        for (const id of ids) {
            const contract = updates[id]
            const oldContract = await this.contractsRepo.read(id, sr)

            if (oldContract.contact_id != contract.contact_id) {
                await this.validateSystemContact(contract, sr)
            }
            if (contract.type == undefined) {
                contract.product_id = oldContract.product_id
                contract.type = oldContract.type
            } else {
                await this.setProductId(contract, sr)
            }
            // as v1: a changed profile becomes active now, the mappings scheduled so far stay
            if (contract.billing_profile_id != undefined && contract.billing_profile_id != oldContract.billing_profile_id) {
                await this.validateBillingProfile(contract, sr)
                profileChanges.set(id, contract.billing_profile_id)
            }
        }
        await this.contractsRepo.update(updates, sr)
        for (const [id, profileId] of profileChanges) {
            await this.contractsRepo.appendBillingMappings(id, [
                internal.BillingMapping.create({billingProfileId: profileId, startDate: now}),
            ], sr)
        }
        return ids
    }

}
