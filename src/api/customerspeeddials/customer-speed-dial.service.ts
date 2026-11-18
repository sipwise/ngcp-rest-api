import {HttpStatus, Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {apiError, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class CustomerSpeedDialService implements CrudService<internal.CustomerSpeedDial> {
    private readonly log = new LoggerService(CustomerSpeedDialService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(CustomerSpeedDialMariadbRepository) private readonly customerSpeedDialRepo: CustomerSpeedDialMariadbRepository,
    ) {
    }

    async create(entities: internal.CustomerSpeedDial[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial[]> {
        await this.checkPermissions(entities.map(csd => csd.contractId), sr)
        await this.transformDestinations([...entities.entries()], sr)
        const createdIds = await this.customerSpeedDialRepo.create(entities, sr)
        return await this.customerSpeedDialRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.CustomerSpeedDial[], number]> {
        return await this.customerSpeedDialRepo.readAll(sr, this.roleFilter(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        return await this.customerSpeedDialRepo.readById(id, sr, this.roleFilter(sr))
    }

    async update(updates: Dictionary<internal.CustomerSpeedDial>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const csds = await this.customerSpeedDialRepo.readWhereInIds(ids, sr, this.roleFilter(sr))
        throwMissingIds(sr, ids, csds.map(csd => csd.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        await this.checkPermissions(Object.values(updates).map(csd => csd.contractId), sr)
        await this.transformDestinations(Object.entries(updates), sr)
        return await this.customerSpeedDialRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const csds = await this.customerSpeedDialRepo.readWhereInIds(ids, sr)
        throwMissingIds(sr, ids, csds.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        await this.checkPermissions(csds.map(csd => csd.contractId), sr)
        return await this.customerSpeedDialRepo.delete(ids, sr)
    }

    private roleFilter(sr: ServiceRequest): FilterBy | undefined {
        if (sr.user.role == 'subscriberadmin')
            return {customerId: sr.user.customer_id}
        if (sr.user.role == 'reseller' || sr.user.role == 'ccare')
            return {resellerId: sr.user.reseller_id}
        return undefined
    }

    // 404 unless every customer exists and is in the user's scope
    private async checkPermissions(customerIds: number[], sr: ServiceRequest): Promise<void> {
        if (sr.user.role == 'subscriberadmin' && customerIds.some(id => id != sr.user.customer_id))
            throw new NotFoundException()
        const uniqueIds = [...new Set(customerIds)]
        const resellerIds = await this.customerSpeedDialRepo.readCustomerResellerIds(uniqueIds)
        for (const id of uniqueIds) {
            if (!resellerIds.has(id) || sr.user.reseller_id_required && resellerIds.get(id) != sr.user.reseller_id)
                throw new NotFoundException()
        }
    }

    // a destination without `sip:` gets the domain of the customer's (pilot) subscriber
    private async transformDestinations(items: [number | string, internal.CustomerSpeedDial][], sr: ServiceRequest): Promise<void> {
        const plainItems = items.filter(([, csd]) => !RegExp('^sip:').test(csd.destination))
        const customerIds = [...new Set(plainItems.map(([, csd]) => csd.contractId))]
        const domains = await this.customerSpeedDialRepo.readSubscriberDomains(customerIds, {isPilot: true})
        const withoutPilot = customerIds.filter(id => !domains.has(id))
        if (withoutPilot.length) {
            for (const [id, domain] of await this.customerSpeedDialRepo.readSubscriberDomains(withoutPilot, {isPilot: false}))
                domains.set(id, domain)
        }
        await forEachYield(plainItems, ([key, csd]) => {
            const domain = domains.get(csd.contractId)
            if (!domain)
                throw apiError(this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'), itemPointer(sr, key, csd, 'contractId'), HttpStatus.FORBIDDEN)
            csd.destination = `sip:${csd.destination}@${domain}`
        })
    }
}
