import {PbxUserOptions} from './pbx-user-options.interface'

import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PbxUserRepository {
    readAll(options: PbxUserOptions, sr: ServiceRequest): Promise<[internal.PbxUser[], number]>
    readById(id: number, options: PbxUserOptions, sr: ServiceRequest): Promise<internal.PbxUser>
}