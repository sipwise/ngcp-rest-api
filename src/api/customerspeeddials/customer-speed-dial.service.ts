import {HttpStatus, Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {apiError, itemPointer, readFoundIds, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
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
        for (const [index, csd] of entities.entries()) {
            await this.checkPermissions(csd.contractId, sr)
            await this.checkAndTransformDestination(csd, sr, index)
        }
        const createdIds = await this.customerSpeedDialRepo.create(entities, sr)
        return await this.customerSpeedDialRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.CustomerSpeedDial[], number]> {
        if (sr.user.role == 'subscriberadmin')
            return await this.customerSpeedDialRepo.readAll(sr, {customerId: sr.user.customer_id})
        if (sr.user.role == 'reseller' || sr.user.role == 'ccare')
            return await this.customerSpeedDialRepo.readAll(sr, {resellerId: sr.user.reseller_id})
        return await this.customerSpeedDialRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        if (sr.user.role == 'subscriberadmin')
            return await this.customerSpeedDialRepo.readById(id, sr, {customerId: sr.user.customer_id})
        if (sr.user.role == 'reseller' || sr.user.role == 'ccare')
            return await this.customerSpeedDialRepo.readById(id, sr, {resellerId: sr.user.reseller_id})
        return await this.customerSpeedDialRepo.readById(id, sr)
    }

    async update(updates: Dictionary<internal.CustomerSpeedDial>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        throwMissingIds(sr, ids, await readFoundIds(ids, id => this.read(id, sr)), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        for (const id of ids) {
            const entity = updates[id]
            await this.checkPermissions(entity.contractId, sr)
            await this.checkAndTransformDestination(entity, sr, id)
        }
        return await this.customerSpeedDialRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const csds = await this.customerSpeedDialRepo.readWhereInIds(ids, sr)
        throwMissingIds(sr, ids, csds.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        for (const csd of csds) {
            await this.checkPermissions(csd.contractId, sr)
        }
        return await this.customerSpeedDialRepo.delete(ids, sr)
    }

    private async checkPermissions(id: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.role == 'subscriberadmin' && sr.user.customer_id != id) {
            throw new NotFoundException()
        }
        if (!await this.customerSpeedDialRepo.checkCustomerExistsAndCustomerReseller(id, sr.user.reseller_id, sr.user.reseller_id_required)) {
            throw new NotFoundException()
        }
    }

    private async checkAndTransformDestination(entity: internal.CustomerSpeedDial, sr: ServiceRequest, key: number | string): Promise<void> {
        if (!RegExp('^sip:').test(entity.destination)) {
            let domain: string
            domain = await this.customerSpeedDialRepo.readSubscriberDomain(entity.contractId, {isPilot: true})
            if (!domain)
                domain = await this.customerSpeedDialRepo.readSubscriberDomain(entity.contractId, {isPilot: false})
            // the destination's domain is the one of the customer's (pilot) subscriber
            if (!domain)
                throw apiError(this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'), itemPointer(sr, key, entity, 'contractId'), HttpStatus.FORBIDDEN)
            entity.destination = `sip:${entity.destination}@${domain}`
        }
    }
}
