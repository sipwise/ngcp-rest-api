import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringRuleRepository {
    create(sd: internal.VoipPeeringRule[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringRule[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringRule>

    update(updates: Dictionary<internal.VoipPeeringRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
