import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringGroupServerRepository {
    create(sd: internal.VoipPeeringServer[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringServer[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringServer>

    update(updates: Dictionary<internal.VoipPeeringServer>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
