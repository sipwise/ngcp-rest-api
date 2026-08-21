import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface RewriteRuleSetRepository {
    create(sd: internal.RewriteRuleSet[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.RewriteRuleSet[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.RewriteRuleSet>

    update(updates: Dictionary<internal.RewriteRuleSet>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
