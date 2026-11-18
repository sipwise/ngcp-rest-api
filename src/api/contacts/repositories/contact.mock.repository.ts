import {NotFoundException} from '@nestjs/common'

import {ContactOptions} from '~/api/contacts/interfaces/contact-options.interface'
import {ContactRepository} from '~/api/contacts/interfaces/contact.repository'
import {internal} from '~/entities'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface ContactMockDB {
    [key: number]: internal.Contact
}

interface ContractMockDB {
    [key: number]: internal.Contract
}

interface ResellerMockDB {
    [key: number]: internal.Reseller
}

// TODO: implement internal.VoipSubscriber
// interface SubscribersMockDB {
//     [key: number]: internal.VoipSubscriber
// }

export class ContactMockRepository implements ContactRepository {
    private readonly contactDB: ContactMockDB
    private readonly contractDB: ContractMockDB
    private readonly resellerDB: ResellerMockDB

    constructor() {
        this.contractDB = {
            1: internal.Contract.create({contact_id: 2, id: 1, status: ContractStatus.Active}),
            2: internal.Contract.create({contact_id: 3, id: 2, status: ContractStatus.Terminated}),
        }
        this.contactDB = {
            1: internal.Contact.create({id: 1, status: ContactStatus.Active}),
            2: internal.Contact.create({id: 2, reseller_id: 1, status: ContactStatus.Active}),
            3: internal.Contact.create({id: 3, reseller_id: 1, status: ContactStatus.Active}),
        }
        this.resellerDB = {
            1: internal.Reseller.create({contract_id: 1, id: 1, name: 'reseller1', status: ResellerStatus.Active}),
            2: internal.Reseller.create({contract_id: 1, id: 2, name: 'reseller2', status: ResellerStatus.Active}),
            3: internal.Reseller.create({contract_id: 1, id: 3, name: 'reseller3', status: ResellerStatus.Active}),
        }
    }

    create(contacts: internal.Contact[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const contact of contacts) {
            const nextId = this.getNextId(this.contactDB)
            contact.id = nextId
            ids.push(nextId)
            this.contactDB[nextId] = contact
        }
        return Promise.resolve(ids)
    }

    delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids) {
            this.throwErrorIfIdNotExists(this.contactDB, id)
        }
        return Promise.resolve(ids)
    }

    readIdsWithActiveContract(ids: number[]): Promise<number[]> {
        return Promise.resolve(this.contractContactIds(ids, contract => contract.status != ContractStatus.Terminated))
    }

    readIdsWithTerminatedContract(ids: number[]): Promise<number[]> {
        return Promise.resolve(this.contractContactIds(ids, contract => contract.status == ContractStatus.Terminated))
    }

    // TODO: implement once we have internal.VoipSubscriber
    readIdsWithActiveSubscriber(_ids: number[]): Promise<number[]> {
        return Promise.resolve<number[]>([])
    }

    readIdsWithTerminatedSubscriber(_ids: number[]): Promise<number[]> {
        return Promise.resolve<number[]>([])
    }

    readAll(_sr: ServiceRequest, _options?: ContactOptions): Promise<[internal.Contact[], number]> {
        const contacts: [internal.Contact[], number] =
            [Object.keys(this.contactDB).map(id => this.contactDB[id] as internal.Contact), Object.keys(this.contactDB).length]
        return Promise.resolve(contacts)
    }

    readById(id: number, options?: ContactOptions): Promise<internal.Contact> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        const contact = this.contactDB[id]
        if (options) {
            switch (options.type) {
                case ContactType.SystemContact:
                    if (contact.reseller_id == undefined) {
                        return Promise.resolve(contact)
                    }
                    throw new NotFoundException()
                case ContactType.CustomerContact:
                    if (contact.reseller_id != undefined) {
                        return Promise.resolve(contact)
                    }
                    throw new NotFoundException()
            }
        }
        return Promise.resolve(contact)
    }


    readWhereInIds(ids: number[], options?: ContactOptions): Promise<internal.Contact[]> {
        return Promise.resolve(ids.map(id => this.contactDB[id]).filter(contact => {
            if (!contact)
                return false
            if (options?.type === ContactType.CustomerContact)
                return contact.reseller_id != undefined
            if (options?.type === ContactType.SystemContact)
                return contact.reseller_id == undefined
            return true
        }))
    }

    readActiveContactsInIds(ids: number[], options?: ContactOptions): Promise<internal.Contact[]> {
        return Promise.resolve(ids.map(id => this.contactDB[id]).filter(contact => {
            if (!contact || contact.status !== ContactStatus.Active)
                return false
            if (options?.type === ContactType.CustomerContact && contact.reseller_id == undefined)
                return false
            if (options?.type === ContactType.SystemContact && contact.reseller_id != undefined)
                return false
            return options?.filterBy?.resellerId == undefined || contact.reseller_id == options.filterBy.resellerId
        }))
    }

    readExistingResellerIds(ids: number[]): Promise<number[]> {
        return Promise.resolve(ids.filter(id => this.resellerDB[id] != undefined))
    }

    terminate(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            this.throwErrorIfIdNotExists(this.contactDB, id)
        return Promise.resolve(ids)
    }

    update(updates: Dictionary<internal.Contact>, _options: ContactOptions): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const contact = updates[id]
            this.throwErrorIfIdNotExists(this.contactDB, id)
            contact.id = id
            this.contactDB[id] = contact
        }
        return Promise.resolve(ids)
    }

    private contractContactIds(ids: number[], matches: (contract: internal.Contract) => boolean): number[] {
        const contracts = Object.values(this.contractDB) as internal.Contract[]
        return ids.filter(id => contracts.some(contract => contract.contact_id == id && matches(contract)))
    }

    private getNextId(db: unknown): number {
        const keys = Object.keys(db)
        return (+keys[keys.length - 1]) + 1
    }

    private throwErrorIfIdNotExists(db: unknown, id: number): void {
        if (db[id] == undefined)
            throw new NotFoundException()
    }

}
