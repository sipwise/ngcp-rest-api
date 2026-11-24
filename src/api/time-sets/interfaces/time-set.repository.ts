import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface FilterBy {
    resellerId?: number
}

export interface TimeSetRepository {
    create(entities: internal.TimeSet[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.TimeSet[], number]>

    readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSet>

    readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSet[]>

    readIcal(id: number): Promise<string | null>

    readExistingResellerIds(ids: number[]): Promise<number[]>

    readNameConflicts(names: string[], excludeIds: number[]): Promise<internal.TimeSet[]>

    readUsedIds(ids: number[]): Promise<number[]>

    update(updates: Dictionary<internal.TimeSet>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
