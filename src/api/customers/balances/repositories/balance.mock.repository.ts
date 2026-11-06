import {NotFoundException} from '@nestjs/common'

import {CustomerBalanceRepository} from '~/api/customers/balances/interfaces/balance.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class CustomerBalanceMockRepository implements CustomerBalanceRepository {
    readonly balanceDB: {[key: number]: internal.ContractBalance}
    // contract id -> reseller id of the contract's contact
    readonly resellerOfContract: {[key: number]: number}

    constructor() {
        this.balanceDB = {
            1: internal.ContractBalance.create({id: 1, contractId: 1, cashBalance: 10, freeTimeBalance: 100}),
            2: internal.ContractBalance.create({id: 2, contractId: 2, cashBalance: 20, freeTimeBalance: 200}),
            3: internal.ContractBalance.create({id: 3, contractId: 3, cashBalance: 30, freeTimeBalance: 300}),
        }
        this.resellerOfContract = {1: 1, 2: 1, 3: 2}
    }

    private matches(balance: internal.ContractBalance, filterBy?: FilterBy): boolean {
        if (filterBy?.customerId && balance.contractId != filterBy.customerId)
            return false
        if (filterBy?.resellerId && this.resellerOfContract[balance.contractId] != filterBy.resellerId)
            return false
        return true
    }

    async readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.ContractBalance[], number]> {
        const result = Object.values(this.balanceDB).filter(b => this.matches(b, filterBy))
        return Promise.resolve([result, result.length])
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.ContractBalance> {
        const balance = this.balanceDB[id]
        if (!balance || !this.matches(balance, filterBy))
            throw new NotFoundException()
        return Promise.resolve(balance)
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.ContractBalance[]> {
        return Promise.resolve(ids.map(id => this.balanceDB[id]).filter(b => b && this.matches(b, filterBy)))
    }

    async update(updates: Dictionary<internal.ContractBalance>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids)
            this.balanceDB[id] = internal.ContractBalance.create({...this.balanceDB[id], ...updates[id]})
        return Promise.resolve(ids)
    }
}
