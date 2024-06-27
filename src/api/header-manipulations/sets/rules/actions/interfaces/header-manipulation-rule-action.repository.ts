import {ServiceRequest} from '../../../../../../interfaces/service-request.interface'
import {internal} from '../../../../../../entities'
import {Dictionary} from '../../../../../../helpers/dictionary.helper'

export interface HeaderManipulationRuleActionRepository {
    create(sd: internal.HeaderRuleAction[], sr: ServiceRequest): Promise<internal.HeaderRuleAction[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleAction[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleAction>

    update(updates: Dictionary<internal.HeaderRuleAction>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
