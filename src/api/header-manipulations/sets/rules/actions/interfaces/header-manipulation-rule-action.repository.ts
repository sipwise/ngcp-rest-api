import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface HeaderManipulationRuleActionRepository {
    create(sd: internal.HeaderRuleAction[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleAction[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleAction>

    update(updates: Dictionary<internal.HeaderRuleAction>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
