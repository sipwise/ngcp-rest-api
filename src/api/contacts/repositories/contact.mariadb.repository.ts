import {UnprocessableEntityException} from '@nestjs/common'
import {In, ObjectLiteral, SelectQueryBuilder} from 'typeorm'

import {ContactSearchDto} from '~/api/contacts/dto/contact-search.dto'
import {ContactOptions} from '~/api/contacts/interfaces/contact-options.interface'
import {ContactRepository} from '~/api/contacts/interfaces/contact.repository'
import {CustomerContactSearchDto} from '~/api/customercontacts/dto/customer-contact-search.dto'
import {SystemContactSearchDto} from '~/api/systemcontacts/dto/system-contact-search.dto'
import {db, internal} from '~/entities'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

// not a class method, as MariaDbRepository wraps all methods with HandleDbErrors making them async
function searchDtoByType(type?: ContactType): ContactSearchDto | CustomerContactSearchDto | SystemContactSearchDto {
    switch (type) {
        case ContactType.CustomerContact:
            return new CustomerContactSearchDto()
        case ContactType.SystemContact:
            return new SystemContactSearchDto()
        default:
            return new ContactSearchDto()
    }
}

// contact ids among `ids` referenced by a row of the query builder's table (contracts, subscribers)
async function referencedContactIds(qb: SelectQueryBuilder<ObjectLiteral>, ids: number[]): Promise<number[]> {
    if (!ids.length)
        return []
    const rows = await qb.select(`DISTINCT ${qb.alias}.contact_id`, 'id')
        .andWhere(`${qb.alias}.contact_id IN (:...ids)`, {ids})
        .getRawMany<{id: number}>()
    return rows.map(row => row.id)
}

export class ContactMariadbRepository extends MariaDbRepository implements ContactRepository {
    private readonly log = new LoggerService(ContactMariadbRepository.name)

    async create(contacts: internal.Contact[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Contact.createQueryBuilder('contact')
        const now = new Date()
        const values = contacts.map(contact => {
            const entity = new db.billing.Contact().fromInternal(contact)
            entity.create_timestamp ??= now
            entity.modify_timestamp ??= now
            return entity
        })
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.Contact.delete(ids)
        return ids
    }

    async terminate(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.Contact.update({id: In(ids)}, {status: ContactStatus.Terminated})
        return ids
    }

    async readWhereInIds(ids: number[], options?: ContactOptions): Promise<internal.Contact[]> {
        const qb = await this.createBaseQueryBuilder(options)
        const contacts = await qb.andWhereInIds(ids).getMany()
        return await mapYield(contacts, (contact) => contact.toInternal())
    }

    async readActiveContactsInIds(ids: number[], options?: ContactOptions): Promise<internal.Contact[]> {
        const qb = await this.createBaseQueryBuilder(options)
        qb.andWhere('contact.status = :status', {status: ContactStatus.Active})
        const contacts = await qb.andWhereInIds(ids).getMany()
        return await mapYield(contacts, (contact) => contact.toInternal())
    }

    async readById(id: number, options?: ContactOptions): Promise<internal.Contact> {
        const qb = await this.createBaseQueryBuilder(options)
        qb.andWhere('contact.id = :id', {id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    // ids of `ids` that are resellers, unset ids are left out
    async readExistingResellerIds(ids: number[]): Promise<number[]> {
        const resellerIds = ids.filter(id => id != null)
        if (!resellerIds.length)
            return []
        const resellers = await db.billing.Reseller.find({select: {id: true}, where: {id: In(resellerIds)}})
        return resellers.map(reseller => reseller.id)
    }

    async readIdsWithActiveContract(ids: number[]): Promise<number[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
            .where('contract.status != :status', {status: ContractStatus.Terminated})
        return await referencedContactIds(qb, ids)
    }

    async readIdsWithTerminatedContract(ids: number[]): Promise<number[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
            .where('contract.status = :status', {status: ContractStatus.Terminated})
        return await referencedContactIds(qb, ids)
    }

    async readIdsWithActiveSubscriber(ids: number[]): Promise<number[]> {
        const qb = db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .where('subscriber.status != :status', {status: VoipSubscriberStatus.Terminated})
        return await referencedContactIds(qb, ids)
    }

    async readIdsWithTerminatedSubscriber(ids: number[]): Promise<number[]> {
        const qb = db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .where('subscriber.status = :status', {status: VoipSubscriberStatus.Terminated})
        return await referencedContactIds(qb, ids)
    }

    async readAll(sr: ServiceRequest, options?: ContactOptions): Promise<[internal.Contact[], number]> {
        this.log.debug({
            message: 'read all contacts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const qb = await this.createBaseQueryBuilder(options)
        const searchDto = searchDtoByType(options?.type)
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        const [result, count] = await qb.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    async update(updates: Dictionary<internal.Contact>, _options?: ContactOptions): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const update = new db.billing.Contact().fromInternal(updates[id])
            if (update.status == null)
                throw new UnprocessableEntityException([`[${id}] status should not be empty`])
            // timestamps are not client writable, the db keeps create_timestamp and sets modify_timestamp on update
            delete update.id
            delete update.create_timestamp
            delete update.modify_timestamp
            delete update.terminate_timestamp
            update.newsletter ??= false
            Object.keys(update).map(key => {
                if (update[key] === undefined)
                    delete update[key]
            })
            await db.billing.Contact.update(id, update)
        }
        return ids
    }

    private createBaseQueryBuilder(options: ContactOptions): Promise<SelectQueryBuilder<db.billing.Contact>> {
        const qb = db.billing.Contact.createQueryBuilder('contact')
        if (options) {
            this.addPermissionFilterToQueryBuilder(qb, options)
            this.addFilterByType(qb, options.type)
        }
        return Promise.resolve(qb)
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
