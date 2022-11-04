import {
    ForbiddenException,
    Inject,
    Injectable,
} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RbacRole} from '../../config/constants.config'
import {Messages} from '../../config/messages.config'
import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class CustomerSpeedDialService implements CrudService<internal.CustomerSpeedDial> {
    private readonly log = new LoggerService(CustomerSpeedDialService.name)

    constructor(
        @Inject(CustomerSpeedDialMariadbRepository) private readonly customerSpeedDialRepo: CustomerSpeedDialMariadbRepository,
    ) {
    }

    async create(entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        await this.checkPermissions(entity.contract_id, sr)
        await this.checkAndTransformDestination(entity, sr)
        return await this.customerSpeedDialRepo.create(entity, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]> {
        if (sr.user.role == 'subscriberadmin')
            return await this.customerSpeedDialRepo.readAll(sr, { customerId: sr.user.customer_id })
        if (sr.user.role == 'reseller' || sr.user.role == 'ccare')
            return await this.customerSpeedDialRepo.readAll(sr, { resellerId: sr.user.reseller_id })
        return await this.customerSpeedDialRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        if (sr.user.role == 'subscriberadmin')
            return await this.customerSpeedDialRepo.readById(id, sr, { customerId: sr.user.customer_id })
        if (sr.user.role == 'reseller' || sr.user.role == 'ccare')
            return await this.customerSpeedDialRepo.readById(id, sr, { resellerId: sr.user.reseller_id })
        return await this.customerSpeedDialRepo.readById(id, sr)
    }

    async update(id: number, entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        await this.checkPermissions(entity.contract_id, sr)
        await this.checkAndTransformDestination(entity, sr)
        return await this.customerSpeedDialRepo.update(id, entity, sr)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        const oldCsd = await this.customerSpeedDialRepo.readById(id, sr)
        const csd = applyPatch(oldCsd, patch).newDocument
        await this.checkPermissions(oldCsd.contract_id, sr)
        await this.checkPermissions(csd.contract_id, sr)
        await this.checkAndTransformDestination(csd, sr)
        return await this.customerSpeedDialRepo.update(id, csd, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        const csd = await this.customerSpeedDialRepo.readById(id, sr)
        await this.checkPermissions(csd.contract_id, sr)
        return await this.customerSpeedDialRepo.delete(id, sr)
    }

    private async checkPermissions(id: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.role == 'subscriberadmin' && sr.user.customer_id != id) {
            throw new ForbiddenException(
                Messages.invoke(Messages.PERMISSION_DENIED, sr),
            )
        }
        if (!this.customerSpeedDialRepo.checkCustomerExistsAndCustomerReseller(id, sr.user.reseller_id, sr.user.reseller_id_required)) {
            throw new ForbiddenException(
                Messages.invoke(Messages.PERMISSION_DENIED, sr),
            )
        }
    }

    private async checkAndTransformDestination(entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<void> {
        if (!RegExp('^sip:').test(entity.destination)) {
            let domain: string
            domain = await this.customerSpeedDialRepo.readSubscriberDomain(entity.contract_id, { isPilot: true })
            if (!domain)
                domain = await this.customerSpeedDialRepo.readSubscriberDomain(entity.contract_id, { isPilot: false })
            if (!domain) {
                throw new ForbiddenException(
                    Messages.invoke(Messages.SUBSCRIBER_NOT_FOUND, sr),
                )
            }
            entity.destination = `sip:${entity.destination}@${domain}`
        }
    }
}
