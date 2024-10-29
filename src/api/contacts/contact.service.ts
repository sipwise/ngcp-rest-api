import {HttpException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ContactMariadbRepository} from './repositories/contact.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ContactService implements CrudService<internal.Contact>{
    private readonly log = new LoggerService(ContactService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ContactMariadbRepository) private readonly contactRepo: ContactMariadbRepository,
    ) {
    }

    async create(contacts: internal.Contact[], sr: ServiceRequest): Promise<internal.Contact[]> {
        this.log.debug({
            message: 'create contact',
            func: this.create.name,
            user: sr.user.username,
        })
        for (const contact of contacts) {
            if (contact.reseller_id !== undefined) {
                if (sr.user.reseller_id_required) {
                    contact.reseller_id = sr.user.reseller_id
                }
                const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
                if (!reseller) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
                }
            }
        }
        const createdIds = await this.contactRepo.create(contacts, sr)
        return await this.contactRepo.readWhereInIds(createdIds)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({
            message: 'delete contact by id',
            func: this.delete.name,
            contactId: ids,
            user: sr.user.username,
        })
        const contacts = await this.contactRepo.readWhereInIds(ids, {})
        if (ids.length != contacts.length)
            throw new UnprocessableEntityException()

        // TODO: should exceptions be HttpException? I think this should be determined by the controller
        for (const contact of contacts) {
            if (contact.reseller_id !== undefined) {  // check for active contracts and subscribers when deleting customercontact
                if (await this.contactRepo.hasContactActiveContract(contact.id, sr)) {
                    throw new HttpException(this.i18n.t('errors.CONTACT_HAS_ACTIVE_CONTRACT'), 423) // 423 HTTP LOCKED
                }

                if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr)) {
                    throw new HttpException(this.i18n.t('errors.CONTACT_HAS_ACTIVE_SUBSCRIBER'), 423) // 423 HTTP LOCKED
                }

                if (await this.contactRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactRepo.hasContactTerminatedSubscriber(contact.id, sr)) {
                    await this.contactRepo.terminate(contact.id, sr) // TODO: currently there is no way of knowing whether contact was deleted or terminated
                }
            }
        }
        return await this.contactRepo.delete(ids, sr)
    }

    async read(id: number, _sr: ServiceRequest): Promise<internal.Contact> {
        return await this.contactRepo.readById(id)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const [result, count] = await this.contactRepo.readAll(sr)
        return [result, count]
    }

    async update(updates: Dictionary<internal.Contact>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        this.log.debug({
            message: 'update customer contact',
            func: this.update.name,
            ids: ids,
            user: sr.user.username,
        })
        for (const id of ids) {
            const contact = updates[id]
            const oldContact = await this.contactRepo.readById(id)
            if (oldContact.reseller_id !== undefined) {
                if (oldContact.reseller_id != contact.reseller_id) {
                    const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
                    if (!reseller) {
                        throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
                    }
                }
            }
        }
        return await this.contactRepo.update(updates)
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
}
