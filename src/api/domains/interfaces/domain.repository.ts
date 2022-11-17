import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface DomainRepository {
    create(domain: internal.Domain, req: ServiceRequest): Promise<internal.Domain>

    readAll(req: ServiceRequest): Promise<[internal.Domain[], number]>

    readById(id: number, req: ServiceRequest): Promise<internal.Domain>

    readByDomain(domain: string, req: ServiceRequest): Promise<internal.Domain>

    delete(id: number, req: ServiceRequest): Promise<number>
}