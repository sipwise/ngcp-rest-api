import {NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {ContractStatus} from '../../../entities/internal/contract.internal.entity'
import {ResellerRepository} from '../interfaces/reseller.repository'
import {Dictionary} from '../../../helpers/dictionary.helper'

interface ResellerMockDB {
    [key: number]: internal.Reseller
}

interface ContractMockDB {
    [key: number]: internal.Contract
}

export class ResellerMockRepository implements ResellerRepository {
    private readonly resellerDB: ResellerMockDB
    private readonly contractDB: ContractMockDB

    constructor() {
        this.resellerDB = {
            1: internal.Reseller.create({contract_id: 1, id: 1, name: 'reseller1', status: ResellerStatus.Active}),
            2: internal.Reseller.create({contract_id: 2, id: 2, name: 'reseller1', status: ResellerStatus.Active}),
        }
        this.contractDB = {
            1: internal.Contract.create({id: 1, status: ContractStatus.Active, contact_id: 1}),
            2: internal.Contract.create({id: 2, status: ContractStatus.Active, contact_id: 1}),
            3: internal.Contract.create({id: 3, status: ContractStatus.Active, contact_id: 1}),
            4: internal.Contract.create({id: 4, status: ContractStatus.Active}),
            5: internal.Contract.create({id: 5, status: ContractStatus.Active, contact_id: 1}),
        }
    }

    contractExists(contractId: number): Promise<boolean> {
        return Promise.resolve(this.contractDB[contractId] != undefined)
    }

    contractHasSystemContact(contractId: number): Promise<boolean> {
        return Promise.resolve(this.contractDB[contractId].contact_id != undefined)
    }

    create(reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller> {
        const nextId = this.getNextId(this.resellerDB)
        reseller.id = nextId
        this.resellerDB[nextId] = reseller

        return Promise.resolve(reseller)
    }

    createEmailTemplates(resellerId: number): Promise<void> {
        return Promise.resolve(undefined)
    }

    findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]> {
        return Promise.resolve([])
    }

    read(id: number, sr: ServiceRequest): Promise<internal.Reseller> {
        this.throwErrorIfIdNotExists(this.resellerDB, id)
        return Promise.resolve(this.resellerDB[id])
    }

    readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]> {
        const resellers: [internal.Reseller[], number] =
            [Object.keys(this.resellerDB).map(id => this.resellerDB[id]), Object.keys(this.resellerDB).length]
        return Promise.resolve(resellers)
    }

    readByName(name: string, sr: ServiceRequest): Promise<internal.Reseller> {
        for (const key of Object.keys(this.resellerDB)) {
            const id: number = +key
            const reseller: internal.Reseller = this.resellerDB[id]
            if (reseller.name == name) {
                return Promise.resolve(reseller)
            }
        }
        return Promise.resolve(undefined)
    }

    renameReseller(id: number, name: string): Promise<void> {
        return Promise.resolve(undefined)
    }

    resellerWithContractExists(contractId: number): Promise<boolean> {
        for (const id of Object.keys(this.resellerDB)) {
            const reseller: internal.Reseller = this.resellerDB[id]
            if (reseller.contract_id == contractId) {
                return Promise.resolve(true)
            }
        }
        return Promise.resolve(false)
    }

    terminate(id: number, sr: ServiceRequest): Promise<number> {
        return Promise.resolve(0)
    }

    update(updates: Dictionary<internal.Reseller>, sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve(undefined)
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