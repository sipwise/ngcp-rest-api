import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface ProductRepository {
    readAll(sr: ServiceRequest): Promise<[internal.Product[], number]>

    read(id: number, sr: ServiceRequest): Promise<internal.Product>
}