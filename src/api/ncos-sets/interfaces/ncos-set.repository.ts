import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface NCOSSetRepository {
    create(sd: internal.NCOSSet, req: ServiceRequest): Promise<internal.NCOSSet>

    readAll(req: ServiceRequest): Promise<[internal.NCOSSet[], number]>

    readById(id: number, req: ServiceRequest): Promise<internal.NCOSSet>

    update(id: number, admin: internal.NCOSSet, req: ServiceRequest): Promise<internal.NCOSSet>

    delete(id: number, req: ServiceRequest): Promise<number>

    createLevel(sd: internal.NCOSSetLevel, req: ServiceRequest): Promise<internal.NCOSSetLevel>

    readLevelAll(req: ServiceRequest, id?: number): Promise<[internal.NCOSSetLevel[], number]>

    readLevelById(id: number, levelId: number, req: ServiceRequest): Promise<internal.NCOSSetLevel>

    deleteLevel(id: number, levelId: number, req: ServiceRequest): Promise<number>

}