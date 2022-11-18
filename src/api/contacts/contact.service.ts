import {HttpException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {ContactMariadbRepository} from './repositories/contact.mariadb.repository'
import {Messages} from '../../config/messages.config'
import {CrudService} from '../../interfaces/crud-service.interface'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class ContactService implements CrudService<internal.Contact>{
    private readonly log = new LoggerService(ContactService.name)

    constructor(
        @Inject(ContactMariadbRepository) private readonly contactRepo: ContactMariadbRepository,
    ) {
    }

    async create(contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'create contact',
            func: this.create.name,
            user: sr.user.username,
        })
        if (contact.reseller_id !== undefined) {
            if (sr.user.reseller_id_required) {
                contact.reseller_id = sr.user.reseller_id
            }
            const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
            if (!reseller) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID, sr))
            }
        }
        return await this.contactRepo.create(contact, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete contact by id',
            func: this.delete.name,
            contactId: id,
            user: sr.user.username,
        })
        const contact = await this.contactRepo.readContactById(id, sr)

        // TODO: should exceptions be HttpException? I think this should be determined by the controller
        if (contact.reseller_id !== undefined) {  // check for active contracts and subscribers when deleting customercontact
            if (await this.contactRepo.hasContactActiveContract(contact.id, sr)) {
                throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
            }

            if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr)) {
                throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
            }

            if (await this.contactRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactRepo.hasContactTerminatedSubscriber(contact.id, sr)) {
                return await this.contactRepo.terminate(contact.id, sr) // TODO: currently there is no way of knowing whether contact was deleted or terminated
            }
        }
        return await this.contactRepo.delete(id, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        return await this.contactRepo.readContactById(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const [result, count] = await this.contactRepo.readAllContacts(sr)
        return [result, count]
    }

    async update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'update customer contact',
            func: this.update.name,
            contactId: id,
            user: sr.user.username,
        })
        const oldContact = await this.contactRepo.readContactById(id, sr)
        if (oldContact.reseller_id !== undefined) {
            if (oldContact.reseller_id != contact.reseller_id) {
                const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
                if (!reseller) {
                    throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID))
                }
            }
        }
        return await this.contactRepo.update(id, contact, sr)
    }

    /**
     * Checks whether the update is valid.
     *
     * The update is invalid when trying to set the reseller_id when it previously was undefined and the other way around
     * @param oldContact
     * @param newContact
     * @private
     */
    private validateUpdate(oldContact: internal.Contact, newContact: internal.Contact): boolean {
        if (oldContact.reseller_id !== undefined && newContact.reseller_id === undefined) {
            return false
        }
        if (oldContact.reseller_id === undefined && newContact.reseller_id !== undefined) {
            return false
        }
        return true
    }

    adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Contact> {
        return Promise.resolve(undefined)
    }
}