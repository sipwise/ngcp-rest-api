import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface JournalRepository {
    create(journals: internal.Journal[]): Promise<void>

    readAll(sr: ServiceRequest, resourceName?: string, resourceId?: number | string, resourceVerified?: boolean): Promise<[internal.Journal[], number]>
}