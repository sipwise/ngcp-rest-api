import {ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {Dictionary} from '../../helpers/dictionary.helper'

@Injectable()
export class CustomerSpeedDialService implements CrudService<internal.CustomerSpeedDial> {
    private readonly log = new LoggerService(CustomerSpeedDialService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(CustomerSpeedDialMariadbRepository) private readonly customerSpeedDialRepo: CustomerSpeedDialMariadbRepository,
    ) {
    }

    async create(entities: internal.CustomerSpeedDial[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial[]> {
        for (const csd of entities) {
            await this.checkPermissions(csd.contractId, sr)
            await this.checkAndTransformDestination(csd, sr)
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
        for (const id of ids) {
            const entity = updates[id]
            await this.checkPermissions(entity.contractId, sr)
            await this.checkAndTransformDestination(entity, sr)
        }
        return await this.customerSpeedDialRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const csds = await this.customerSpeedDialRepo.readWhereInIds(ids, sr)
        if (ids.length != csds.length)
            throw new UnprocessableEntityException()
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

    private async checkAndTransformDestination(entity: internal.CustomerSpeedDial, _sr: ServiceRequest): Promise<void> {
        if (!RegExp('^sip:').test(entity.destination)) {
            let domain: string
            domain = await this.customerSpeedDialRepo.readSubscriberDomain(entity.contractId, {isPilot: true})
            if (!domain)
                domain = await this.customerSpeedDialRepo.readSubscriberDomain(entity.contractId, {isPilot: false})
            if (!domain) {
                throw new ForbiddenException(this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'))
            }
            entity.destination = `sip:${entity.destination}@${domain}`
        }
    }
}
