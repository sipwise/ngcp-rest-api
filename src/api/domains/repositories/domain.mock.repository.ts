import {DomainRepository} from '../interfaces/domain.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {NotFoundException} from '@nestjs/common'

interface DomainMockDB {
    [key: number]: internal.Domain
}

export class DomainMockRepository implements DomainRepository {

    private readonly db: DomainMockDB
    private nextId: number

    constructor() {
        this.db = {
            1: {id: 1, reseller_id: 1, domain: 'domain1'},
            2: {id: 2, reseller_id: 2, domain: 'domain2'},
            3: {id: 3, reseller_id: 3, domain: 'domain3'},
            4: {id: 4, reseller_id: 1, domain: 'domain4'},
        }
        this.nextId = Object.keys(this.db).length + 1
    }

    async create(domains: internal.Domain[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const domain of domains) {
            domain.id = this.nextId
            ids.push(domain.id)
            this.db[domain.id] = domain
            this.nextId++
        }
        return Promise.resolve(ids)
    }

    async delete(id: number, _sr: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(id)
    }

    async readAll(_sr: ServiceRequest): Promise<[internal.Domain[], number]> {
        const domains: [internal.Domain[], number] =
            [Object.keys(this.db).map(id => this.db[id]), Object.keys(this.db).length]
        return Promise.resolve(domains)
    }

    async readByDomain(_domain: string, _sr: ServiceRequest): Promise<internal.Domain> {
        return Promise.resolve(undefined)
    }

    async readById(id: number, _sr: ServiceRequest): Promise<internal.Domain> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Domain[]> {
        const domains: internal.Domain[] = []
        for (const id of ids) {
            domains.push(await this.readById(id, sr))
        }
        return Promise.resolve(domains)
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }

}
