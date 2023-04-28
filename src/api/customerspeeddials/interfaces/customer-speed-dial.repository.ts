import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'
import {Dictionary} from '../../../helpers/dictionary.helper'

export interface CustomerSpeedDialRepository {
    create(sd: internal.CustomerSpeedDial[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.CustomerSpeedDial[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.CustomerSpeedDial>

    update(updates: Dictionary<internal.CustomerSpeedDial>, sr: ServiceRequest): Promise<number[]>

    delete(id: number[], sr: ServiceRequest): Promise<number[]>
}
