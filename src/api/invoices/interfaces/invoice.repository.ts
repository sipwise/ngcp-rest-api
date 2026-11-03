import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface InvoiceRepository {
    readAll(sr: ServiceRequest): Promise<[internal.Invoice[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.Invoice>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
