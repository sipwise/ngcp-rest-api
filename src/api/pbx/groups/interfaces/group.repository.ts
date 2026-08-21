import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PbxGroupRepository {
    readAll(sr: ServiceRequest): Promise<[internal.PbxGroup[], number]>
    readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroup>
}