import {HttpException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {ContactsMariadbRepository} from './repositories/contacts.mariadb.repository'
import {Messages} from '../../config/messages.config'
import {CrudService} from '../../interfaces/crud-service.interface'
import {Operation as PatchOperation} from '../../helpers/patch.helper'

@Injectable()
export class ContactsService implements CrudService<internal.Contact>{
    private readonly log: Logger = new Logger(ContactsService.name)

    constructor(
        private readonly contactsRepo: ContactsMariadbRepository,
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
            const reseller = await this.contactsRepo.readResellerById(contact.reseller_id, sr)
            if (!reseller) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID, sr))
            }
        }
        return await this.contactsRepo.create(contact, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete contact by id',
            func: this.delete.name,
            contactId: id,
            user: sr.user.username,
        })
        const contact = await this.contactsRepo.readCustomerContactById(id, sr)

        if (contact.reseller_id !== undefined) {  // check for active contracts and subscribers when deleting customercontact
            if (await this.contactsRepo.hasContactActiveContract(contact.id, sr)) {
                throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
            }

            if (await this.contactsRepo.hasContactActiveSubscriber(contact.id, sr)) {
                throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
            }

            if (await this.contactsRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactsRepo.hasContactTerminatedSubscriber(contact.id, sr)) {
                return await this.contactsRepo.terminate(contact.id, sr)
            }
        }
        return await this.contactsRepo.delete(id, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        return await this.contactsRepo.readContactById(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const [result, count] = await this.contactsRepo.readAllContacts(sr)
        return [result, count]
    }

    async update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'update customer contact',
            func: this.update.name,
            contactId: id,
            user: sr.user.username,
        })
        const oldContact = await this.contactsRepo.readContactById(id, sr)
        if (oldContact.reseller_id !== undefined) {
            if (oldContact.reseller_id != contact.reseller_id) {
                const reseller = await this.contactsRepo.readResellerById(contact.reseller_id, sr)
                if (!reseller) {
                    throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID))
                }
            }
        }
        return await this.contactsRepo.update(id, contact, sr)
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

    adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<internal.Contact> {
        return Promise.resolve(undefined)
    }
}