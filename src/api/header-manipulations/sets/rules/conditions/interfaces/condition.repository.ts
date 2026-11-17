import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface HeaderManipulationRuleConditionRepository {
    // source of values (the stored values); the reads leave them unset
    readonly lazyFields: LazyFieldSources

    create(sd: internal.HeaderRuleCondition[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.HeaderRuleCondition[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.HeaderRuleCondition>

    update(updates: Dictionary<internal.HeaderRuleCondition>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
