import {ContactRepository} from '../interfaces/contact.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {ContactStatus} from '../../../entities/internal/contact.internal.entity'
import {ContractStatus} from '../../../entities/internal/contract.internal.entity'
import {NotFoundException} from '@nestjs/common'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'

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

    create(entity: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        const nextId = this.getNextId(this.contactDB)
        entity.id = nextId
        this.contactDB[nextId] = entity

        return Promise.resolve(entity)
    }

    delete(id: number, sr: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        return Promise.resolve(1)
    }

    hasContactActiveContract(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.throwErrorIfIdNotExists(this.contactDB, contactId)
        for (const key of Object.keys(this.contractDB)) {
            const id: number = +key
            const contract: internal.Contract = this.contractDB[id]
            if (contract.contact_id == contactId) {
                return Promise.resolve(contract.status == ContractStatus.Active)
            }
        }
        return Promise.resolve(false)
    }

    hasContactActiveSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.throwErrorIfIdNotExists(this.contactDB, contactId)
        // TODO: implement once we have internal.VoipSubscriber
        // for (const key of Object.keys(this.contractsDB)) {
        //     const id: number = +key
        //     const subscriber: internal.VoipSubscriber = this.subscriberDB[id]
        //     if (subscriber.contact_id == contactId) {
        //         return Promise.resolve(subscriber.status == ContractStatus.Active)
        //     }
        // }
        return Promise.resolve(false)
    }

    hasContactTerminatedContract(contactId: number, sr: ServiceRequest): Promise<boolean> {
        this.throwErrorIfIdNotExists(this.contactDB, contactId)
        for (const key of Object.keys(this.contractDB)) {
            const id: number = +key
            const contract: internal.Contract = this.contractDB[id]
            if (contract.contact_id == contactId) {
                return Promise.resolve(contract.status == ContractStatus.Terminated)
            }
        }
        return Promise.resolve(false)
    }

    hasContactTerminatedSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean> {
        return Promise.resolve(false)
    }

    readAllContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        const contacts: [internal.Contact[], number] =
            [Object.keys(this.contactDB).map(id => this.contactDB[id]), Object.keys(this.contactDB).length]
        return Promise.resolve(contacts)
    }

    readAllCustomerContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        return Promise.resolve([[], 0])
    }

    readAllSystemContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]> {
        return Promise.resolve([[], 0])
    }

    readContactById(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        return Promise.resolve(this.contactDB[id])
    }

    readCustomerContactById(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        const contact = this.contactDB[id]
        if (contact.reseller_id != undefined) {
            return Promise.resolve(contact)
        }
        throw new NotFoundException()
    }

    readResellerById(id: number, sr: ServiceRequest): Promise<internal.Reseller> {
        return Promise.resolve(this.resellerDB[id])
    }

    readSystemContactById(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        const contact = this.contactDB[id]
        if (contact.reseller_id == undefined)
            return Promise.resolve(contact)
        throw new NotFoundException()
    }

    terminate(id: number, sr: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        return Promise.resolve(1)
    }

    update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact> {
        this.throwErrorIfIdNotExists(this.contactDB, id)
        contact.id = id
        this.contactDB[id] = contact
        return Promise.resolve(contact)
    }

    private getNextId(db: any): number {
        const keys = Object.keys(db)
        return (+keys[keys.length - 1]) + 1
    }

    private throwErrorIfIdNotExists(db: any, id: number) {
        if (db[id] == undefined)
            throw new NotFoundException()
    }
}