import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface RewriteRuleRepository {
    create(sd: internal.RewriteRule[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.RewriteRule[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.RewriteRule>

    update(updates: Dictionary<internal.RewriteRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
