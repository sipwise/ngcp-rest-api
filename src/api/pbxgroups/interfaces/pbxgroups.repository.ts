import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface PbxgroupsRepository {
    readAll(req: ServiceRequest): Promise<[internal.PbxGroup[], number]>

    readById(id: number, req: ServiceRequest): Promise<internal.PbxGroup>
}