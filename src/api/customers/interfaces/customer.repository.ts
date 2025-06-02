import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface CustomerRepository {
    create(sd: internal.Customer[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.Customer[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.Customer>

    update(updates: Dictionary<internal.Customer>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
