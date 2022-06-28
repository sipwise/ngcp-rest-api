import {ContactsRepository} from '../interfaces/contacts.repository'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {Logger} from '@nestjs/common'
import {Not, SelectQueryBuilder} from 'typeorm'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {db, internal} from '../../../entities'
import {ContactStatus} from '../../../entities/internal/contact.internal.entity'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {ContactSearchDto} from '../dto/contact-search.dto'
import {VoipSubscriberStatus} from '../../../entities/internal/voip-subscriber.internal.entity'
import {ContractStatus} from '../../../entities/internal/contract.internal.entity'

export class ContactsMariadbRepository implements ContactsRepository {

    private readonly log: Logger = new Logger(ContactsMariadbRepository.name)

    @HandleDbErrors
    async create(entity: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        const contact = db.billing.Contact.create()
        contact.fromInternal(entity)

        const now = new Date(Date.now())
        contact.create_timestamp = now
        contact.modify_timestamp = now

        await db.billing.Contact.insert(contact)
        return contact.toInternal()
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete contact by id',
            func: this.delete.name,
            contactId: id,
            user: sr.user.username,
        })
        await db.billing.Contact.delete(id)
        return 1
    }

    @HandleDbErrors
    async terminate(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'terminate contact by id',
            func: this.terminate.name,
            contactId: id,
            user: sr.user.username,
        })
        await db.billing.Contact.update(id, {status: ContactStatus.Terminated})
        return 0
    }

    @HandleDbErrors
    async readContactById(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({message: 'read contact by id', func: this.readContactById.name, user: sr.user.username})
        const qb = await this.createBaseQueryBuilder(sr)
        qb.andWhere('contact.id = :id', {id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    @HandleDbErrors
    async readCustomerContactById(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read customer contact by id',
            func: this.readCustomerContactById.name,
            user: sr.user.username,
        })
        const qb = await this.createBaseQueryBuilder(sr)
        qb.andWhere('contact.id = :id', {id: id})
        qb.andWhere('contact.reseller_id IS NOT NULL')
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    @HandleDbErrors
    async readResellerById(id: number, sr: ServiceRequest): Promise<db.billing.Reseller> { // TODO: change type to internal.Reseller
        return await db.billing.Reseller.findOne(id)
    }

    @HandleDbErrors
    async hasContactActiveContract(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'check whether contact has active contract',
            contactId: contactId,
            func: this.hasContactActiveContract.name,
            user: sr.user.username,
        })
        const contracts = await db.billing.Contract.find({
            where: {
                status: Not(ContractStatus.Terminated),
                contact_id: contactId,
            },
        })
        return contracts.length != 0
    }

    @HandleDbErrors
    async hasContactTerminatedContract(contactId: number, sr: ServiceRequest): Promise<boolean> {
        // v1 backwards compatability
        this.log.debug({
            message: 'check whether contact has terminated contract',
            contactId: contactId,
            func: this.hasContactActiveContract.name,
            user: sr.user.username,
        })
        const contracts = await db.billing.Contract.find({
            where: {
                status: ContractStatus.Terminated,
                contact_id: contactId,
            },
        })
        return contracts.length != 0
    }

    @HandleDbErrors
    async hasContactActiveSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'check whether contact has active subscribers',
            contactId: contactId,
            func: this.hasContactActiveSubscriber.name,
            user: sr.user.username,
        })
        const subscribers = await db.billing.VoipSubscriber.find({
            where: {
                status: Not(VoipSubscriberStatus.Terminated),
                contact_id: contactId,
            },
        })
        return subscribers.length != 0
    }

    @HandleDbErrors
    async hasContactTerminatedSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'check whether contact has active subscribers',
            contactId: contactId,
            func: this.hasContactTerminatedSubscriber.name,
            user: sr.user.username,
        })
        const subscribers = await db.billing.VoipSubscriber.find({
            where: {
                status: VoipSubscriberStatus.Terminated,
                contact_id: contactId,
            },
        })
        return subscribers.length != 0
    }

    @HandleDbErrors
    async readSystemContactById(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read system contact by id',
            func: this.readSystemContactById.name,
            user: sr.user.username,
        })
        const qb = await this.createBaseQueryBuilder(sr)
        qb.andWhere('contact.id = :id', {id: id})
        qb.andWhere('contact.reseller_id IS NULL')
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    @HandleDbErrors
    async readAllContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all contacts',
            func: this.readAllContacts.name,
            user: sr.user.username,
        })

        const queryBuilder = await this.createReadAllQueryBuilder(sr)
        const [result, count] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    @HandleDbErrors
    async readAllCustomerContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all customer contacts',
            func: this.readAllCustomerContacts.name,
            user: sr.user.username,
        })

        const queryBuilder = await this.createReadAllQueryBuilder(sr)
        queryBuilder.andWhere('contact.reseller_id IS NOT NULL')
        const [result, count] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    @HandleDbErrors
    async readAllSystemContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all system contacts',
            func: this.readAllCustomerContacts.name,
            user: sr.user.username,
        })

        const queryBuilder = await this.createReadAllQueryBuilder(sr)
        queryBuilder.andWhere('contact.reseller_id IS NULL')
        const [result, count] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    @HandleDbErrors
    async update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        const update = new db.billing.Contact().fromInternal(contact)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        await db.billing.Contact.update(id, update)

        return await this.readCustomerContactById(id, sr)
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Contact>> {
        const qb = db.billing.Contact.createQueryBuilder('contact')
        await this.addPermissionFilterToQueryBuilder(qb, sr)
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Contact>> {
        const qb = await this.createBaseQueryBuilder(sr)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new ContactSearchDto())))
        return qb
    }

    private async addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contact>, sr: ServiceRequest) {
        if (sr.user.reseller_id_required) {
            qb.andWhere('contact.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
        }
    }
}