import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'
import {AdminOptions} from './admin-options.interface'

export interface AdminRepository {
    create(admins: internal.Admin[]): Promise<number[]>

    readAll(options: AdminOptions, sr: ServiceRequest): Promise<[internal.Admin[], number]>

    readById(id: number, options: AdminOptions): Promise<internal.Admin>

    readWhereInIds(ids: number[], options: AdminOptions): Promise<internal.Admin[]>
    update(id: number, admin: internal.Admin, options: AdminOptions): Promise<internal.Admin>

    delete(id: number[]): Promise<number[]>
}