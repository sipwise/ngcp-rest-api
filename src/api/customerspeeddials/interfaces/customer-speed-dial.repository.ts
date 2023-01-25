import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface CustomerSpeedDialRepository {
    create(sd: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial>

    readAll(sr: ServiceRequest): Promise<[internal.CustomerSpeedDial[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.CustomerSpeedDial>

    update(id: number, admin: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial>

    delete(id: number[], sr: ServiceRequest): Promise<number[]>
}