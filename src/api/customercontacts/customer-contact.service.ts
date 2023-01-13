import {BadRequestException, HttpException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {AppService} from '../../app.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'

@Injectable()
export class CustomerContactService implements CrudService<internal.Contact> {
    private readonly log = new LoggerService(CustomerContactService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ContactMariadbRepository) private readonly contactRepo: ContactMariadbRepository,
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
        await this.resellerIdExists(contact.reseller_id, sr)
        return await this.contactRepo.create(contact, sr)
    }

    async createMany(contacts: internal.Contact[], sr: ServiceRequest): Promise<internal.Contact[]> {
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
        const createdIds = await this.contactRepo.createMany(contacts, sr)
        return await this.contactRepo.readWhereInIds(createdIds)
    }

    private async resellerIdExists(id: number, sr: ServiceRequest) {
        const reseller = await this.contactRepo.readResellerById(id, sr)
        if (!reseller) {
            throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
        }
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
            throw new BadRequestException(this.i18n.t('errors.CONTACT_DELETE_SYSTEM_CONTACT')) // TODO: find better description
        }

        if (await this.contactRepo.hasContactActiveContract(contact.id, sr)) {
            throw new HttpException(this.i18n.t('errors.CONTACT_HAS_ACTIVE_CONTRACT'), 423) // 423 HTTP LOCKED
        }

        if (await this.contactRepo.hasContactActiveSubscriber(contact.id, sr)) {
            throw new HttpException(this.i18n.t('errors.CONTACT_HAS_ACTIVE_SUBSCRIBER'), 423) // 423 HTTP LOCKED
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
                throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
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
            throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
        }
        return await this.contactRepo.update(id, contact, sr)
    }

}

