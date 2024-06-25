import {ServiceRequest} from '../../../../../interfaces/service-request.interface'
import {internal} from '../../../../../entities'
import {Dictionary} from '../../../../../helpers/dictionary.helper'

export interface HeaderManipulationRuleRepository {
    create(sd: internal.HeaderRule[], sr: ServiceRequest): Promise<internal.HeaderRule[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRule[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRule>

    update(updates: Dictionary<internal.HeaderRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
