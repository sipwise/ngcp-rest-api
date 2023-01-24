import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface AdminRepository {
    create(admin: internal.Admin): Promise<internal.Admin>

    readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.Admin>

    update(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin>

    delete(id: number, sr: ServiceRequest): Promise<internal.Admin>
}