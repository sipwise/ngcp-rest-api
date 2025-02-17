
import {BanAdminOptions} from '~/api/bans/admins/interfaces/ban-admin-options.interface'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface BanAdminRepository {
    readAll(options: BanAdminOptions, sr: ServiceRequest): Promise<[internal.BanAdmin[], number]>
    readById(id: number, options: BanAdminOptions, sr: ServiceRequest): Promise<internal.BanAdmin>
    readWhereInIds(ids: number[], options: BanAdminOptions, sr: ServiceRequest): Promise<internal.BanAdmin[]>
}