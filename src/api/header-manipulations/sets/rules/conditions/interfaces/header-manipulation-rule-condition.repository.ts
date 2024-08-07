import {ServiceRequest} from '../../../../../../interfaces/service-request.interface'
import {internal} from '../../../../../../entities'
import {Dictionary} from '../../../../../../helpers/dictionary.helper'

export interface HeaderManipulationRuleConditionRepository {
    create(sd: internal.HeaderRuleCondition[], sr: ServiceRequest): Promise<internal.HeaderRuleCondition[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleCondition[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleCondition>

    update(updates: Dictionary<internal.HeaderRuleCondition>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
