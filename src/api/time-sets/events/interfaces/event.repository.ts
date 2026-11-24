import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface FilterBy {
    timeSetId?: number
    resellerId?: number
}

export interface TimeSetEventRepository {
    create(entities: internal.TimeSetEvent[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.TimeSetEvent[], number]>

    readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSetEvent>

    readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSetEvent[]>

    update(updates: Dictionary<internal.TimeSetEvent>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

    deleteByTimeSetIds(timeSetIds: number[]): Promise<void>
}
