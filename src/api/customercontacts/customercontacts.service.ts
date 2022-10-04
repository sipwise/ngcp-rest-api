import {BadRequestException, HttpException, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {AppService} from '../../app.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Messages} from '../../config/messages.config'
import {ContactsMariadbRepository} from '../contacts/repositories/contacts.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class CustomercontactsService implements CrudService<internal.Contact> {
    private readonly log = new LoggerService(CustomercontactsService.name)

    constructor(
        private readonly app: AppService,
        private readonly contactRepo: ContactsMariadbRepository,
    ) {
    }

    async create(contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'create customer contact',
            func: this.create.name,
            user: sr.user.username,
        })
        if (sr.user.reseller_id_required) {
            contact.reseller_id = sr.user.reseller_id
        }
        const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
        if (!reseller) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID, sr))
        }
        return await this.contactRepo.create(contact, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete customer contact by id',
            func: this.delete.name,
            contactId: id,
            user: sr.user.username,
        })
        const contact = await this.contactRepo.readCustomerContactById(id, sr)
        if (!contact.reseller_id) { // TODO: imo this check is redundant as the repository only returns customer contacts
            throw new BadRequestException(Messages.invoke(Messages.DELETE_SYSTEMCONTACT)) // TODO: find better description
        }

        if (await this.contactRepo.hasContactActiveContract(contact.id, sr)) {
            throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
        }

        if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr)) {
            throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
        }

        if (await this.contactRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactRepo.hasContactTerminatedSubscriber(contact.id, sr)) {
            return await this.contactRepo.terminate(contact.id, sr)
        }
        return await this.contactRepo.delete(id, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read customer contact by id',
            func: this.read.name,
            contactId: id,
            user: sr.user.username,
        })
        return this.contactRepo.readCustomerContactById(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all customer contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.contactRepo.readAllCustomerContacts(sr)
    }

    async update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'update customer contact',
            func: this.update.name,
            contactId: id,
            user: sr.user.username,
        })
        if (sr.user.reseller_id_required) {
            contact.reseller_id = sr.user.reseller_id
        }
        const oldContact = await this.contactRepo.readCustomerContactById(id, sr)
        if (oldContact.reseller_id != contact.reseller_id) {
            const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
            if (!reseller) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID))
            }
        }
        return await this.contactRepo.update(id, contact, sr)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'adjust customer contact',
            func: this.adjust.name,
            contactId: id,
            user: sr.user.username,
        })
        let contact = await this.contactRepo.readCustomerContactById(id, sr)

        contact = applyPatch(contact, patch).newDocument
        contact.id = id

        if (sr.user.reseller_id_required) {
            contact.reseller_id = sr.user.reseller_id
        }

        const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
        if (!reseller) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID))
        }
        return await this.contactRepo.update(id, contact, sr)
    }
}

