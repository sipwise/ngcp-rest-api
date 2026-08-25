import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface NCOSSetLevelRepository {
    create(sd: internal.NCOSSetLevel[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.NCOSSetLevel[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.NCOSSetLevel>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
