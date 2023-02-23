import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'
import {AdminOptions} from './admin-options.interface'
import {Dictionary} from '../../../helpers/dictionary.helper'

export interface AdminRepository {
    create(admins: internal.Admin[]): Promise<number[]>

    readAll(options: AdminOptions, sr: ServiceRequest): Promise<[internal.Admin[], number]>

    readById(id: number, options: AdminOptions): Promise<internal.Admin>

    readWhereInIds(ids: number[], options: AdminOptions): Promise<internal.Admin[]>

    update(updates: Dictionary<internal.Admin>, options: AdminOptions): Promise<number[]>

    delete(id: number[]): Promise<number[]>
}