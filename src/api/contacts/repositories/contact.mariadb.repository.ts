import {ContactRepository} from '../interfaces/contact.repository'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {Not, SelectQueryBuilder} from 'typeorm'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {db, internal} from '../../../entities'
import {ContactStatus, ContactType} from '../../../entities/internal/contact.internal.entity'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {ContactSearchDto} from '../dto/contact-search.dto'
import {VoipSubscriberStatus} from '../../../entities/internal/voip-subscriber.internal.entity'
import {ContractStatus} from '../../../entities/internal/contract.internal.entity'
import {LoggerService} from '../../../logger/logger.service'
import {ContactOptions} from '../interfaces/contact-options.interface'
import {Dictionary} from '../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../repositories/mariadb.repository'

export class ContactMariadbRepository extends MariaDbRepository implements ContactRepository {
    private readonly log = new LoggerService(ContactMariadbRepository.name)

    async create(contacts: internal.Contact[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Admin.createQueryBuilder('contact')
        const values = contacts.map(contact => new db.billing.Contact().fromInternal(contact))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map(obj => obj.id)
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.Contact.delete(ids)
        return ids
    }

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

    async readWhereInIds(ids: number[], options?: ContactOptions): Promise<internal.Contact[]> {
        const qb = await this.createBaseQueryBuilder(options)
        const contacts = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(contacts.map(async (contact) => contact.toInternal()))
    }

    async readById(id: number, options?: ContactOptions): Promise<internal.Contact> {
        const qb = await this.createBaseQueryBuilder(options)
        qb.andWhere('contact.id = :id', {id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readResellerById(id: number, _sr: ServiceRequest): Promise<db.billing.Reseller> { // TODO: change type to internal.Reseller
        return await db.billing.Reseller.findOneBy({id: id})
    }

    async hasContactActiveContract(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'check whether contact has active contract',
            contactId: contactId,
            func: this.hasContactActiveContract.name,
            user: sr.user.username,
        })
        const contracts = await db.billing.Contract.find({
            where: {
                status: Not<ContractStatus.Terminated>(ContractStatus.Terminated),
                contact_id: contactId,
            },
        })
        return contracts.length != 0
    }

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

    async readAll(sr: ServiceRequest, options?: ContactOptions): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const qb = await this.createBaseQueryBuilder(options)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new ContactSearchDto())))
        const [result, count] = await qb.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    async update(updates: Dictionary<internal.Contact>, _options?: ContactOptions): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const update = new db.billing.Contact().fromInternal(updates[id])
            Object.keys(update).map(key => {
                if (update[key] == undefined)
                    delete update[key]
            })
            await db.billing.Contact.update(id, update)
        }
        return ids
    }

    private async createBaseQueryBuilder(options: ContactOptions): Promise<SelectQueryBuilder<db.billing.Contact>> {
        const qb = db.billing.Contact.createQueryBuilder('contact')
        if (options) {
            this.addPermissionFilterToQueryBuilder(qb, options)
            this.addFilterByType(qb, options.type)
        }
        return qb
    }

    private addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contact>, options: ContactOptions): void {
        if (options.filterBy && options.filterBy.resellerId) {
            qb.andWhere('contact.reseller_id = :reseller_id', {reseller_id: options.filterBy.resellerId})
        }
    }

    private addFilterByType(qb: SelectQueryBuilder<db.billing.Contact>, type: ContactType): void {
        switch (type) {
        case ContactType.CustomerContact:
            qb.andWhere('contact.reseller_id IS NOT NULL')
            break
        case ContactType.SystemContact:
            qb.andWhere('contact.reseller_id IS NULL')
            break
        }
    }
}
