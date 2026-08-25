import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface NCOSSetRepository {
    create(sd: internal.NCOSSet[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.NCOSSet[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.NCOSSet>

    update(updates: Dictionary<internal.NCOSSet>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

}
