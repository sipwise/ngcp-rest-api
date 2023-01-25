import {ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {validateOrReject} from 'class-validator'
import {I18nService} from 'nestjs-i18n'

@Injectable()
export class CustomerSpeedDialService implements CrudService<internal.CustomerSpeedDial> {
    private readonly log = new LoggerService(CustomerSpeedDialService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(CustomerSpeedDialMariadbRepository) private readonly customerSpeedDialRepo: CustomerSpeedDialMariadbRepository,
    ) {
    }

    async create(entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        await this.checkPermissions(entity.contractId, sr)
        await this.checkAndTransformDestination(entity, sr)
        return await this.customerSpeedDialRepo.create(entity, sr)
    }

    async createMany(entities: internal.CustomerSpeedDial[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial[]> {
        for (const csd of entities) {
            await this.checkPermissions(csd.contractId, sr)
            await this.checkAndTransformDestination(csd, sr)
        }
        const createdIds = await this.customerSpeedDialRepo.createMany(entities, sr)
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

    async update(id: number, entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        await this.checkPermissions(entity.contractId, sr)
        await this.checkAndTransformDestination(entity, sr)
        return await this.customerSpeedDialRepo.update(id, entity, sr)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        const oldCsd = await this.customerSpeedDialRepo.readById(id, sr)
        const csd: internal.CustomerSpeedDial = applyPatch(oldCsd, patch).newDocument
        await this.checkPermissions(csd.contractId, sr)
        try {
            await validateOrReject(csd)
        } catch(e) {
            throw new UnprocessableEntityException(e)
        }
        await this.checkAndTransformDestination(csd, sr)
        return await this.customerSpeedDialRepo.update(id, csd, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const csds = await this.customerSpeedDialRepo.readWhereInIds(ids, sr)
        if (ids.length != csds.length)
            throw new UnprocessableEntityException()
        for(const csd of csds) {
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

    private async checkAndTransformDestination(entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<void> {
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
