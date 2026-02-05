import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringGroupRepository {
    create(sd: internal.VoipPeeringGroup[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringGroup[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringGroup>

    update(updates: Dictionary<internal.VoipPeeringGroup>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
