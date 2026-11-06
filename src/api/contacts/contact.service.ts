import {HttpStatus, Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ContactMariadbRepository} from './repositories/contact.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors,apiError, checkItems, idPointer, itemPointer, readFoundIds, throwMissingIds} from '~/helpers/errors.helper'
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
        const errors = new ApiErrors()
        for (const [index, contact] of contacts.entries()) {
            if (contact.reseller_id != null) {
                if (sr.user.reseller_id_required) {
                    contact.reseller_id = sr.user.reseller_id
                }
                if (!await this.contactRepo.readResellerById(contact.reseller_id, sr))
                    errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, index, contact, 'reseller_id'))
            }
        }
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
        await checkItems(contacts.filter(contact => contact.reseller_id != null), async contact => {
            if (await this.contactRepo.hasContactActiveContract(contact.id, sr))
                throw apiError(this.i18n.t('errors.CONTACT_HAS_ACTIVE_CONTRACT'), idPointer(sr, contact.id), HttpStatus.LOCKED)
            if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr))
                throw apiError(this.i18n.t('errors.CONTACT_HAS_ACTIVE_SUBSCRIBER'), idPointer(sr, contact.id), HttpStatus.LOCKED)
        })
        for (const contact of contacts) {
            if (contact.reseller_id != null
                && (await this.contactRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactRepo.hasContactTerminatedSubscriber(contact.id, sr))) {
                await this.contactRepo.terminate(contact.id, sr) // TODO: currently there is no way of knowing whether contact was deleted or terminated
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
        throwMissingIds(sr, ids, await readFoundIds(ids, id => this.contactRepo.readById(id)), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        const errors = new ApiErrors()
        for (const id of ids) {
            const contact = updates[id]
            const oldContact = await this.contactRepo.readById(id)
            if ((oldContact.reseller_id == null) != (contact.reseller_id == null))
                errors.add(this.i18n.t('errors.CONTACT_TYPE_IMMUTABLE'), itemPointer(sr, id, contact, 'reseller_id'))
            else if (oldContact.reseller_id != null && oldContact.reseller_id != contact.reseller_id
                && !await this.contactRepo.readResellerById(contact.reseller_id, sr))
                errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, id, contact, 'reseller_id'))
        }
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
