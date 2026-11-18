import {HttpStatus, Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ContactMariadbRepository} from './repositories/contact.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors,apiError, checkItems, idPointer, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {forEachYield} from '~/helpers/yield.helper'
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
        if (sr.user.reseller_id_required) {
            for (const contact of contacts.filter(contact => contact.reseller_id != null))
                contact.reseller_id = sr.user.reseller_id
        }
        const resellerIds = new Set(await this.contactRepo.readExistingResellerIds(contacts.map(contact => contact.reseller_id)))
        const errors = new ApiErrors()
        await forEachYield(contacts, (contact, index) => {
            if (contact.reseller_id != null && !resellerIds.has(contact.reseller_id))
                errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, index, contact, 'reseller_id'))
        })
        errors.throwIfAny()
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
        throwMissingIds(sr, ids, contacts.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // customer contacts with active contracts or subscribers can't be deleted (423 locked)
        const customerContactIds = contacts.filter(contact => contact.reseller_id != null).map(contact => contact.id)
        const withActiveContract = new Set(await this.contactRepo.readIdsWithActiveContract(customerContactIds))
        const withActiveSubscriber = new Set(await this.contactRepo.readIdsWithActiveSubscriber(customerContactIds))
        await checkItems(customerContactIds, id => {
            if (withActiveContract.has(id))
                throw apiError(this.i18n.t('errors.CONTACT_HAS_ACTIVE_CONTRACT'), idPointer(sr, id), HttpStatus.LOCKED)
            if (withActiveSubscriber.has(id))
                throw apiError(this.i18n.t('errors.CONTACT_HAS_ACTIVE_SUBSCRIBER'), idPointer(sr, id), HttpStatus.LOCKED)
        })
        const terminateIds = [...new Set([
            ...await this.contactRepo.readIdsWithTerminatedContract(customerContactIds),
            ...await this.contactRepo.readIdsWithTerminatedSubscriber(customerContactIds),
        ])]
        if (terminateIds.length)
            await this.contactRepo.terminate(terminateIds, sr) // TODO: currently there is no way of knowing whether contact was deleted or terminated
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
        const oldContacts = new Map((await this.contactRepo.readWhereInIds(ids)).map(contact => [contact.id, contact]))
        throwMissingIds(sr, ids, [...oldContacts.keys()], this.i18n.t('errors.ENTRY_NOT_FOUND'))
        const resellerIds = new Set(await this.contactRepo.readExistingResellerIds(Object.values(updates).map(contact => contact.reseller_id)))
        const errors = new ApiErrors()
        await forEachYield(ids, id => {
            const contact = updates[id]
            const oldContact = oldContacts.get(id)
            if ((oldContact.reseller_id == null) != (contact.reseller_id == null))
                errors.add(this.i18n.t('errors.CONTACT_TYPE_IMMUTABLE'), itemPointer(sr, id, contact, 'reseller_id'))
            else if (oldContact.reseller_id != null && oldContact.reseller_id != contact.reseller_id && !resellerIds.has(contact.reseller_id))
                errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, id, contact, 'reseller_id'))
        })
        errors.throwIfAny()
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
