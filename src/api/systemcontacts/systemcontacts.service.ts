import {BadRequestException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Messages} from '../../config/messages.config'
import {ContactsMariadbRepository} from '../contacts/repositories/contacts.mariadb.repository'

@Injectable()
export class SystemcontactsService { // implements CrudService<SystemcontactCreateDto, SystemcontactResponseDto> {
    private readonly log = new Logger(SystemcontactsService.name)

    constructor(
        private readonly contactRepo: ContactsMariadbRepository,
    ) {
    }

    async create(contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'create system contact',
            func: this.create.name,
            user: sr.user.username,
        })
        if (contact['reseller_id'] !== undefined) {
            throw new BadRequestException(Messages.invoke(Messages.RESELLER_ID_SYSTEMCONTACTS, sr)) // TODO: proper error message
        }
        return await this.contactRepo.create(contact, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete system contact by id',
            func: this.delete.name,
            contactId: id,
            user: sr.user.username,
        })
        const contact = await this.contactRepo.readSystemContactById(id, sr)
        if (contact.reseller_id != undefined) {
            throw new BadRequestException(Messages.invoke(Messages.DELETE_CUSTOMERCONTACT)) // TODO: find better description
        }
        return await this.contactRepo.delete(contact.id, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read system contact by id',
            func: this.read.name,
            contactId: id,
            user: sr.user.username,
        })
        return await this.contactRepo.readSystemContactById(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all system contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.contactRepo.readAllSystemContacts(sr)
    }

    async update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'update system contact by id',
            func: this.update.name,
            contactId: id,
            user: sr.user.username,
        })
        const oldContact = await this.contactRepo.readSystemContactById(id, sr)
        if (contact.reseller_id || oldContact.reseller_id) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.RESELLER_ID_SYSTEMCONTACTS))
        }
        return await this.contactRepo.update(id, contact, sr)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'adjust system contact by id',
            func: this.adjust.name,
            contactId: id,
            user: sr.user.username,
        })
        let contact = await this.contactRepo.readSystemContactById(id, sr)

        contact = applyPatch(contact, patch).newDocument
        contact.id = id

        if (contact.reseller_id != undefined) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.RESELLER_ID_SYSTEMCONTACTS))
        }
        return await this.contactRepo.update(id, contact, sr)
    }
}

