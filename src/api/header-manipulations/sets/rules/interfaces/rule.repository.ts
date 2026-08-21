import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface HeaderManipulationRuleRepository {
    create(sd: internal.HeaderRule[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRule[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRule>

    update(updates: Dictionary<internal.HeaderRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
