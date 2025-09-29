import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringInboundRuleRepository {
    create(sd: internal.VoipPeeringInboundRule[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringInboundRule[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringInboundRule>

    update(updates: Dictionary<internal.VoipPeeringInboundRule>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
