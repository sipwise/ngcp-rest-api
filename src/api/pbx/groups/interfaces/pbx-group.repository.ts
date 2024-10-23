import {ServiceRequest} from '~/interfaces/service-request.interface'
import {internal} from '~/entities'

export interface PbxGroupRepository {
    readAll(sr: ServiceRequest): Promise<[internal.PbxGroup[], number]>
    readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroup>
}