import {ContractRepository} from '../interfaces/contract.respository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {ContractStatus, ContractType} from '../../../entities/internal/contract.internal.entity'
import {ContactStatus} from '../../../entities/internal/contact.internal.entity'
import {NotFoundException} from '@nestjs/common'
import {ProductClass} from '../../../entities/internal/product.internal.entity'

interface ContractMockDB {
    [key: number]: internal.Contract
}

interface ContactMockDB {
    [key: number]: internal.Contact
}

interface ProductMockDB {
    [key: number]: internal.Product
}

export class ContractMockRepository implements ContractRepository {

    private readonly contractDB: ContractMockDB
    private readonly contactDB: ContactMockDB
    private readonly productDB: ProductMockDB

    constructor() {
        this.contactDB = {
            1: internal.Contact.create({id: 1, status: ContactStatus.Active, reseller_id: 1}),
            2: internal.Contact.create({id: 2, status: ContactStatus.Active, reseller_id: 2}),
            3: internal.Contact.create({id: 3, status: ContactStatus.Active}),
        }

        this.contractDB = {
            1: internal.Contract.create({
                id: 1,
                status: ContractStatus.Active,
                contact_id: 3,
                type: ContractType.Reseller,
            }),
            2: internal.Contract.create({
                id: 2,
                status: ContractStatus.Active,
                contact_id: 2,
                type: ContractType.SipPeering,
            }),
            3: internal.Contract.create({
                id: 3,
                status: ContractStatus.Active,
                contact_id: 1,
                type: ContractType.Reseller,
            }),
        }

        this.productDB = {
            1: internal.Product.create({
                class: ProductClass.PstnPeering,
                handle: 'PSTN_PEERING',
                id: 1,
                name: ' PSTN Peering',
                on_sale: true,
            }),
            2: internal.Product.create({
                class: ProductClass.SipPeering,
                handle: 'SIP_PEERING',
                id: 2,
                name: ' SIP Peering',
                on_sale: true,
            }),
            3: internal.Product.create({
                class: ProductClass.Reseller,
                handle: 'VOIP_RESELLER',
                id: 3,
                name: ' VoIP Reseller',
                on_sale: true,
            }),
            4: internal.Product.create({
                class: ProductClass.SipAccount,
                handle: 'SIP_ACCOUNT',
                id: 4,
                name: ' Basic SIP Account',
                on_sale: true,
            }),
            5: internal.Product.create({
                class: ProductClass.PbxAccount,
                handle: 'PBX_ACCOUNT',
                id: 5,
                name: ' Cloud PBX Account',
                on_sale: true,
            }),
        }
    }

    create(entity: internal.Contract, sr: ServiceRequest): Promise<internal.Contract> {
        const nextId = this.getNextId(this.contractDB)
        entity.id = nextId
        this.contractDB[nextId] = entity

        return Promise.resolve(entity)
    }

    delete(id: number, sr: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(this.contractDB, id)
        return Promise.resolve(1)
    }

    read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.throwErrorIfIdNotExists(this.contractDB, id)
        return Promise.resolve(this.contractDB[id])
    }

    readActiveSystemContact(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        const contact = this.contactDB[+id]
        if (contact == undefined)
            return Promise.resolve(undefined)
        if (contact.status == ContactStatus.Active && contact.reseller_id == undefined)
            return Promise.resolve(contact)
        return Promise.resolve(undefined)
    }

    readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        const contracts: [internal.Contract[], number] =
            [Object.keys(this.contractDB).map(id => this.contractDB[id]), Object.keys(this.contractDB).length]
        return Promise.resolve(contracts)
    }

    readProductByType(type: string, sr: ServiceRequest): Promise<internal.Product> {
        for (const key of Object.keys(this.productDB)) {
            const id: number = +key
            const product: internal.Product = this.productDB[id]
            if (product.class == type) {
                return Promise.resolve(product)
            }
        }
        return Promise.resolve(undefined)
    }

    save(id: number, newContract: internal.Contract): Promise<internal.Contract> {
        return Promise.resolve(undefined)
    }

    update(id: number, contract: internal.Contract, sr: ServiceRequest): Promise<internal.Contract> {
        this.throwErrorIfIdNotExists(this.contractDB, id)
        contract.id = id
        this.contractDB[id] = contract
        return Promise.resolve(contract)
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