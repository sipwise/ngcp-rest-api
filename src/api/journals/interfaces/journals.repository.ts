import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface JournalsRepository {
    create(journal: internal.Journal): Promise<internal.Journal>

    read(id: number, req: ServiceRequest): Promise<internal.Journal>

    readAll(req: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]>
}