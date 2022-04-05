import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface DomainsRepository {
    create(domain: internal.Domain, req: ServiceRequest): Promise<internal.Domain>

    readAll(page: number, rows: number, req: ServiceRequest): Promise<[internal.Domain[], number]>

    readById(id: number, req: ServiceRequest): Promise<internal.Domain>

    readByDomain(domain: string, req: ServiceRequest): Promise<internal.Domain>

    delete(id: number, req: ServiceRequest): Promise<number>
}