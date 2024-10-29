import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface DomainRepository {
    create(domain: internal.Domain[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.Domain>

    readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Domain[]>

    readByDomain(domain: string, sr: ServiceRequest): Promise<internal.Domain>

    delete(id: number, sr: ServiceRequest): Promise<number>
}
