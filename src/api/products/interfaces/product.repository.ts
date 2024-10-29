import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ProductRepository {
    readAll(sr: ServiceRequest): Promise<[internal.Product[], number]>

    read(id: number, sr: ServiceRequest): Promise<internal.Product>
}