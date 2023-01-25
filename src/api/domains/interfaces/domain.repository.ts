import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface DomainRepository {
    create(domain: internal.Domain, sr: ServiceRequest): Promise<internal.Domain>

    readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.Domain>

    readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Domain[]>

    readByDomain(domain: string, sr: ServiceRequest): Promise<internal.Domain>

    delete(id: number, sr: ServiceRequest): Promise<number>
}