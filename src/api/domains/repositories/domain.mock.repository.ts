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

    async create(domain: internal.Domain, req: ServiceRequest): Promise<internal.Domain> {
        domain.id = this.nextId
        this.db[domain.id] = domain
        this.nextId++
        return Promise.resolve(domain)
    }

    async delete(id: number, req: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(id)
        // if (req.user.reseller_id != this.db[id].reseller_id) {
        //     throw new ForbiddenException()
        // }
        return Promise.resolve(1)
    }

    async readAll(req: ServiceRequest): Promise<[internal.Domain[], number]> {
        const domains: [internal.Domain[], number] =
            [Object.keys(this.db).map(id => this.db[id]), Object.keys(this.db).length]
        return Promise.resolve(domains)
    }

    async readByDomain(domain: string, req: ServiceRequest): Promise<internal.Domain> {
        return Promise.resolve(undefined)
    }

    async readById(id: number, req: ServiceRequest): Promise<internal.Domain> {
        return Promise.resolve(undefined)
    }

    private throwErrorIfIdNotExists(id: number) {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }
}