import {HttpStatus, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ContactOptions} from '~/api/contacts/interfaces/contact-options.interface'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {ContactType} from '~/entities/internal/contact.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors,apiError, checkItems, idPointer, itemPointer, readFoundIds, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class CustomerContactService implements CrudService<internal.Contact> {
    private readonly log = new LoggerService(CustomerContactService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ContactMariadbRepository) private readonly contactRepo: ContactMariadbRepository,
    ) {
    }

    async create(contacts: internal.Contact[], sr: ServiceRequest): Promise<internal.Contact[]> {
        const now = new Date(Date.now())
        if (sr.user.reseller_id_required) {  // only fetch and validate reseller once if restricted to reseller_id
            if (!await this.contactRepo.readResellerById(sr.user.reseller_id, sr))
                throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
            for (const contact of contacts) {
                contact.reseller_id = sr.user.reseller_id
                contact.create_timestamp = now
                contact.modify_timestamp = now
            }
        } else {  // fetch and validate reseller for each item
            const errors = new ApiErrors()
            for (const [index, contact] of contacts.entries()) {
                if (!await this.contactRepo.readResellerById(contact.reseller_id, sr))
                    errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, index, contact, 'reseller_id'))
                contact.create_timestamp = now
                contact.modify_timestamp = now
            }
            errors.throwIfAny()
        }
        const createdIds = await this.contactRepo.create(contacts, sr)
        return await this.contactRepo.readWhereInIds(createdIds)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({
            message: 'delete customer contact by id',
            func: this.delete.name,
            contactIds: ids,
            user: sr.user.username,
        })
        const options = this.getContactOptionsFromServiceRequest(sr)

        const contacts = await this.contactRepo.readWhereInIds(ids, options)
        throwMissingIds(sr, ids, contacts.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // contacts with active contracts or subscribers can't be deleted (423 locked)
        await checkItems(contacts, async contact => {
            if (!contact.reseller_id) // TODO: imo this check is redundant as the repository only returns customer contacts
                throw apiError(this.i18n.t('errors.CONTACT_DELETE_SYSTEM_CONTACT'), idPointer(sr, contact.id), HttpStatus.BAD_REQUEST)
            if (await this.contactRepo.hasContactActiveContract(contact.id, sr))
                throw apiError(this.i18n.t('errors.CONTACT_HAS_ACTIVE_CONTRACT'), idPointer(sr, contact.id), HttpStatus.LOCKED)
            if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr))
                throw apiError(this.i18n.t('errors.CONTACT_HAS_ACTIVE_SUBSCRIBER'), idPointer(sr, contact.id), HttpStatus.LOCKED)
        })
        for (const contact of contacts) {
            if (await this.contactRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactRepo.hasContactTerminatedSubscriber(contact.id, sr))
                await this.contactRepo.terminate(contact.id, sr)
        }
        return await this.contactRepo.delete(ids, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read customer contact by id',
            func: this.read.name,
            contactId: id,
            user: sr.user.username,
        })
        const options = this.getContactOptionsFromServiceRequest(sr)
        return this.contactRepo.readById(id, options)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all customer contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.contactRepo.readAll(sr, this.getContactOptionsFromServiceRequest(sr))
    }

    async update(updates: Dictionary<internal.Contact>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        this.log.debug({
            message: 'update customer contact',
            func: this.update.name,
            ids: ids,
            user: sr.user.username,
        })

        const options = this.getContactOptionsFromServiceRequest(sr)
        throwMissingIds(sr, ids, await readFoundIds(ids, id => this.contactRepo.readById(id, options)), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const errors = new ApiErrors()
        for (const id of ids) {
            const contact = updates[id]
            if (sr.user.reseller_id_required) {
                contact.reseller_id = sr.user.reseller_id
            }
            const oldContact = await this.contactRepo.readById(id, options)
            if (oldContact.reseller_id != contact.reseller_id && !await this.contactRepo.readResellerById(contact.reseller_id, sr))
                errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, id, contact, 'reseller_id'))
        }
        errors.throwIfAny()
        return await this.contactRepo.update(updates, options)
    }

    getContactOptionsFromServiceRequest(sr: ServiceRequest): ContactOptions {
        const options: ContactOptions = {
            type: ContactType.CustomerContact,
        }
        if (sr.user.role === RbacRole.reseller || sr.user.role === RbacRole.ccare)
            options.filterBy = {resellerId: sr.user.reseller_id}
        return options
    }
}

