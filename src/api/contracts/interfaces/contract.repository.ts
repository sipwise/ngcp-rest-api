import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ContractRepository {
    create(entity: internal.Contract[], sr: ServiceRequest): Promise<number[]>

    delete(id: number, sr: ServiceRequest): Promise<number>

    read(id: number, sr: ServiceRequest): Promise<internal.Contract>

    readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Contract[]>

    readActiveSystemContactIds(ids: number[]): Promise<number[]>

    readProductsByTypes(types: string[]): Promise<internal.Product[]>

    readBillingProfiles(ids: number[]): Promise<internal.BillingProfile[]>

    appendBillingMappings(contractId: number, mappings: internal.BillingMapping[], sr: ServiceRequest): Promise<void>

    readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]>

    update(updates: Dictionary<internal.Contract>, sr: ServiceRequest): Promise<number[]>

}
