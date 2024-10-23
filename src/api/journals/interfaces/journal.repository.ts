import {ServiceRequest} from '~/interfaces/service-request.interface'
import {internal} from '~/entities'

export interface JournalRepository {
    create(journal: internal.Journal): Promise<internal.Journal>

    read(id: number, sr: ServiceRequest): Promise<internal.Journal>

    readAll(sr: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]>
}