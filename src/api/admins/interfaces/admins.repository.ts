import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface AdminsRepository {
    create(admin: internal.Admin): Promise<internal.Admin>

    readAll(page: number, rows: number, req: ServiceRequest): Promise<[internal.Admin[], number]>

    readById(id: number, req: ServiceRequest): Promise<internal.Admin>

    update(id: number, admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin>

    delete(id: number, req: ServiceRequest): Promise<number>
}