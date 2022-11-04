import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface CustomerSpeedDialRepository {
    create(sd: internal.CustomerSpeedDial, req: ServiceRequest): Promise<internal.CustomerSpeedDial>

    readAll(req: ServiceRequest): Promise<[internal.CustomerSpeedDial[], number]>

    readById(id: number, req: ServiceRequest): Promise<internal.CustomerSpeedDial>

    update(id: number, admin: internal.CustomerSpeedDial, req: ServiceRequest): Promise<internal.CustomerSpeedDial>

    delete(id: number, req: ServiceRequest): Promise<number>
}