import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ContractMariadbRepository} from './repositories/contract.mariadb.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {ContractType} from '~/entities/internal/contract.internal.entity'
import {billingProfileError} from '~/helpers/billing-mapping.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {apiError, checkItems, itemPointer, readFoundIds, throwMissingIds} from '~/helpers/errors.helper'
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
        await checkItems(contracts, async (contract, key) => {
            await this.validateSystemContact(contract, sr, key)
            await this.setProductId(contract, sr, key)
            await this.validateBillingProfile(contract, sr, key)
            contract.create_timestamp = now
            contract.modify_timestamp = now
        })
        const createdIds = await this.contractsRepo.create(contracts, sr)
        for (const [index, id] of createdIds.entries()) {
            await this.contractsRepo.appendBillingMappings(id, [
                internal.BillingMapping.create({billingProfileId: contracts[index].billing_profile_id}),
            ], sr)
        }
        return await this.contractsRepo.readWhereInIds(createdIds, sr)
    }

    private async setProductId(contract: internal.Contract, sr: ServiceRequest, key: number | string): Promise<void> {
        const product = await this.contractsRepo.readProductByType(contract.type, sr)
        if (product == undefined)
            throw apiError(this.i18n.t('errors.TYPE_INVALID'), itemPointer(sr, key, contract, 'type'))
        contract.product_id = product.id
    }

    // 'id' mode; the contact is a system contact, so the profile's reseller isn't checked
    private async validateBillingProfile(contract: internal.Contract, sr: ServiceRequest, key: number | string): Promise<void> {
        const profile = await this.contractsRepo.readBillingProfile(contract.billing_profile_id, sr)
        const pointer = itemPointer(sr, key, contract, 'billing_profile_id')
        const profileError = billingProfileError(profile)
        if (profileError)
            throw apiError(this.i18n.t(`errors.${profileError}`), pointer)
        if (profile.prepaid && [ContractType.SipPeering, ContractType.Reseller].includes(contract.type))
            throw apiError(this.i18n.t('errors.PEERING_RESELLER_CONTRACT_PREPAID_PROFILE'), pointer)
    }

    private async validateSystemContact(contract: internal.Contract, sr: ServiceRequest, key: number | string): Promise<void> {
        const systemContact = await this.contractsRepo.readActiveSystemContact(contract.contact_id, sr)
        if (systemContact == undefined)
            throw apiError(this.i18n.t('errors.CONTACT_ID_INVALID'), itemPointer(sr, key, contract, 'contact_id'))
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
        throwMissingIds(sr, ids, await readFoundIds(ids, id => this.contractsRepo.read(id, sr)), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        await checkItems(updates, async (contract, key) => {
            const id = +key
            const oldContract = await this.contractsRepo.read(id, sr)

            if (oldContract.contact_id != contract.contact_id) {
                await this.validateSystemContact(contract, sr, key)
            }
            if (contract.type == undefined) {
                contract.product_id = oldContract.product_id
                contract.type = oldContract.type
            } else {
                await this.setProductId(contract, sr, key)
            }
            // a changed profile becomes active now, the mappings scheduled so far stay
            if (contract.billing_profile_id != undefined && contract.billing_profile_id != oldContract.billing_profile_id) {
                await this.validateBillingProfile(contract, sr, key)
                profileChanges.set(id, contract.billing_profile_id)
            }
        })
        await this.contractsRepo.update(updates, sr)
        for (const [id, profileId] of profileChanges) {
            await this.contractsRepo.appendBillingMappings(id, [
                internal.BillingMapping.create({billingProfileId: profileId, startDate: now}),
            ], sr)
        }
        return ids
    }

}
