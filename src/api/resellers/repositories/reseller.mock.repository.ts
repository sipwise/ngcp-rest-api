import {NotFoundException} from '@nestjs/common'

import {ResellerRepository} from '~/api/resellers/interfaces/reseller.repository'
import {db, internal} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

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

    create(resellers: internal.Reseller[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const reseller of resellers) {
            const nextId = this.getNextId(this.resellerDB)
            reseller.id = nextId
            ids.push(nextId)
            this.resellerDB[nextId] = reseller
        }

        return Promise.resolve(ids)
    }

    createEmailTemplates(_resellerId: number): Promise<void> {
        return Promise.resolve(undefined)
    }

    findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]> {
        return Promise.resolve([] as db.billing.EmailTemplate[])
    }

    read(id: number, _sr: ServiceRequest): Promise<internal.Reseller> {
        this.throwErrorIfIdNotExists(this.resellerDB, id)
        return Promise.resolve(this.resellerDB[id])
    }

    readAll(_sr: ServiceRequest): Promise<[internal.Reseller[], number]> {
        const resellers: [internal.Reseller[], number] =
            [Object.keys(this.resellerDB).map(id => this.resellerDB[id] as internal.Reseller), Object.keys(this.resellerDB).length]
        return Promise.resolve(resellers)
    }

    readWhereInIds(ids: number[], _sr: ServiceRequest): Promise<internal.Reseller[]> {
        const resellers: internal.Reseller[] = []
        for (const id of ids) {
            this.throwErrorIfIdNotExists(this.resellerDB, id)
            resellers.push(this.resellerDB[id])
        }
        return Promise.resolve(resellers)
    }

    readByName(name: string, _sr: ServiceRequest): Promise<internal.Reseller> {
        for (const key of Object.keys(this.resellerDB)) {
            const id: number = +key
            const reseller: internal.Reseller = this.resellerDB[id]
            if (reseller.name == name) {
                return Promise.resolve(reseller)
            }
        }
        return Promise.resolve(undefined)
    }

    renameReseller(_id: number, _name: string): Promise<void> {
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

    terminate(_id: number, _sr: ServiceRequest): Promise<number> {
        return Promise.resolve(0)
    }

    update(_updates: Dictionary<internal.Reseller>, _sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve(undefined)
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
