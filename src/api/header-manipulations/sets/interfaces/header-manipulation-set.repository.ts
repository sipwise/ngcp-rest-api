import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {internal} from '../../../../entities'
import {Dictionary} from '../../../../helpers/dictionary.helper'

export interface HeaderManipulationSetRepository {
    create(sd: internal.HeaderRuleSet[], sr: ServiceRequest): Promise<internal.HeaderRuleSet[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleSet[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleSet>

    update(updates: Dictionary<internal.HeaderRuleSet>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
