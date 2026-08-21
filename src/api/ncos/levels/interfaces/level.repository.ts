import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface NCOSLevelRepository {
    create(sd: internal.NCOSLevel[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.NCOSLevel[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.NCOSLevel>

    update(updates: Dictionary<internal.NCOSLevel>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
