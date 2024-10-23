import {Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {ContactOptions} from '../contacts/interfaces/contact-options.interface'
import {ContactType} from '../../entities/internal/contact.internal.entity'
import {Dictionary} from '../../helpers/dictionary.helper'

@Injectable()
export class SystemContactService implements CrudService<internal.Contact> {
    private readonly log = new LoggerService(SystemContactService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ContactMariadbRepository) private readonly contactRepo: ContactMariadbRepository,
    ) {
    }

    async create(contacts: internal.Contact[], sr: ServiceRequest): Promise<internal.Contact[]> {
        const createdIds = await this.contactRepo.create(contacts, sr)
        return await this.contactRepo.readWhereInIds(createdIds)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({
            message: 'delete system contact by id',
            func: this.delete.name,
            contactId: ids,
            user: sr.user.username,
        })
        const options = this.getContactOptionsFromServiceRequest(sr)
        const contacts = await this.contactRepo.readWhereInIds(ids, options)
        if (ids.length != contacts.length)
            throw new UnprocessableEntityException()
        return await this.contactRepo.delete(ids, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read system contact by id',
            func: this.read.name,
            contactId: id,
            user: sr.user.username,
        })
        return await this.contactRepo.readById(id, this.getContactOptionsFromServiceRequest(sr))
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all system contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.contactRepo.readAll(sr, this.getContactOptionsFromServiceRequest(sr))
    }

    async update(updates: Dictionary<internal.Contact>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        this.log.debug({
            message: 'update system contact bulk',
            func: this.update.name,
            ids: ids,
            user: sr.user.username,
        })
        const options = this.getContactOptionsFromServiceRequest(sr)
        for (const id of ids) {
            const contact = updates[id]
            const oldContact = await this.contactRepo.readById(id, options)
            if (contact.reseller_id || oldContact.reseller_id) {
                throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_IS_CUSTOMER_CONTACT'))
            }
        }
        return await this.contactRepo.update(updates, options)
    }

    getContactOptionsFromServiceRequest(sr: ServiceRequest): ContactOptions {
        const options: ContactOptions = {
            type: ContactType.SystemContact,
        }
        if (sr.user.role === 'reseller' || sr.user.role === 'ccare')
            options.filterBy.resellerId = sr.user.reseller_id
        return options
    }
}

