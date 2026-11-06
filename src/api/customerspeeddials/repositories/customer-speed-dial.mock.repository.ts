import {NotFoundException} from '@nestjs/common'

import {CustomerSpeedDialRepository} from '~/api/customerspeeddials/interfaces/customer-speed-dial.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const mk = (data: Partial<internal.CustomerSpeedDial>): internal.CustomerSpeedDial =>
    Object.assign(new internal.CustomerSpeedDial(), data)

export class CustomerSpeedDialMockRepository implements CustomerSpeedDialRepository {
    readonly csdDB: {[key: number]: internal.CustomerSpeedDial}
    // customer (contract) id -> reseller id
    readonly resellerOfCustomer: {[key: number]: number}
    // customer id -> domains of the pilot / non-pilot subscriber
    readonly pilotDomains: {[key: number]: string}
    readonly subscriberDomains: {[key: number]: string}
    private nextId: number

    constructor() {
        this.csdDB = {
            1: mk({id: 1, contractId: 1, slot: '*1', destination: 'sip:a@example.org'}),
            2: mk({id: 2, contractId: 2, slot: '*2', destination: 'sip:b@example.org'}),
            3: mk({id: 3, contractId: 3, slot: '*3', destination: 'sip:c@example.org'}),
        }
        this.resellerOfCustomer = {1: 1, 2: 1, 3: 2}
        this.pilotDomains = {1: 'pilot.example.org'}
        this.subscriberDomains = {1: 'sub.example.org', 2: 'sub2.example.org'}
        this.nextId = 4
    }

    private matches(csd: internal.CustomerSpeedDial, filterBy?: FilterBy): boolean {
        if (filterBy?.customerId && csd.contractId != filterBy.customerId)
            return false
        if (filterBy?.resellerId && this.resellerOfCustomer[csd.contractId] != filterBy.resellerId)
            return false
        return true
    }

    async create(entities: internal.CustomerSpeedDial[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const entity of entities) {
            const id = this.nextId++
            this.csdDB[id] = mk({...entity, id})
            ids.push(id)
        }
        return Promise.resolve(ids)
    }

    async readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const result = Object.values(this.csdDB).filter(c => this.matches(c, filterBy))
        return Promise.resolve([result, result.length])
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest): Promise<internal.CustomerSpeedDial[]> {
        return Promise.resolve(ids.map(id => this.csdDB[id]).filter(c => c))
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const csd = this.csdDB[id]
        if (!csd || !this.matches(csd, filterBy))
            throw new NotFoundException()
        return Promise.resolve(csd)
    }

    async update(updates: Dictionary<internal.CustomerSpeedDial>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids)
            this.csdDB[id] = mk({...updates[id], id})
        return Promise.resolve(ids)
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            delete this.csdDB[id]
        return Promise.resolve(ids)
    }

    async checkCustomerExistsAndCustomerReseller(customerId: number, resellerId: number, checkReseller: boolean): Promise<boolean> {
        if (!(customerId in this.resellerOfCustomer))
            return Promise.resolve(false)
        return Promise.resolve(!checkReseller || this.resellerOfCustomer[customerId] == resellerId)
    }

    async readSubscriberDomain(customerId: number, options: {isPilot: boolean}): Promise<string> {
        return Promise.resolve(options.isPilot ? this.pilotDomains[customerId] : this.subscriberDomains[customerId])
    }
}
