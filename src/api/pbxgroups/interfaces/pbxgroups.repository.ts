import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface PbxgroupsRepository {
    readAll(page: number, rows: number, req: ServiceRequest): Promise<internal.PbxGroup[]>

    readById(id: number, req: ServiceRequest): Promise<internal.PbxGroup>
}