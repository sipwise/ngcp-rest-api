import {BadRequestException, HttpException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../entities'
import {AppService} from '../../app.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {ContactType} from '../../entities/internal/contact.internal.entity'
import {ContactOptions} from '../contacts/interfaces/contact-options.interface'
import {RbacRole} from '../../config/constants.config'
import {Dictionary} from '../../helpers/dictionary.helper'

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
            await this.resellerIdExists(sr.user.reseller_id, sr)
            for (const contact of contacts) {
                contact.reseller_id = sr.user.reseller_id
                contact.create_timestamp = now
                contact.modify_timestamp = now
            }
        } else {  // fetch and validate reseller for each item
            for (const contact of contacts) {
                await this.resellerIdExists(contact.reseller_id, sr)
                contact.create_timestamp = now
                contact.modify_timestamp = now
            }
        }
        const createdIds = await this.contactRepo.create(contacts, sr)
        return await this.contactRepo.readWhereInIds(createdIds)
    }

    private async resellerIdExists(id: number, sr: ServiceRequest): Promise<void> {
        const reseller = await this.contactRepo.readResellerById(id, sr)
        if (!reseller) {
            throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
        }
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
        if (ids.length != contacts.length)
            throw new UnprocessableEntityException()

        for (const contact of contacts) {
            if (!contact.reseller_id) { // TODO: imo this check is redundant as the repository only returns customer contacts
                throw new BadRequestException(this.i18n.t('errors.CONTACT_DELETE_SYSTEM_CONTACT')) // TODO: find better description
            }

            if (await this.contactRepo.hasContactActiveContract(contact.id, sr)) {
                throw new HttpException(this.i18n.t('errors.CONTACT_HAS_ACTIVE_CONTRACT'), 423) // 423 HTTP LOCKED
            }

            if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr)) {
                throw new HttpException(this.i18n.t('errors.CONTACT_HAS_ACTIVE_SUBSCRIBER'), 423) // 423 HTTP LOCKED
            }

            if (await this.contactRepo.hasContactTerminatedContract(contact.id, sr) || await this.contactRepo.hasContactTerminatedSubscriber(contact.id, sr)) {
                await this.contactRepo.terminate(contact.id, sr)
            }
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

        for (const id of ids) {
            const contact = updates[id]
            if (sr.user.reseller_id_required) {
                contact.reseller_id = sr.user.reseller_id
            }
            const oldContact = await this.contactRepo.readById(id, options)
            if (oldContact.reseller_id != contact.reseller_id) {
                const reseller = await this.contactRepo.readResellerById(contact.reseller_id, sr)
                if (!reseller) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
                }
            }
        }
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

