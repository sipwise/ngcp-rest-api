import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'
import {Dictionary} from '../../../helpers/dictionary.helper'

export interface ContractRepository {
    create(entity: internal.Contract, sr: ServiceRequest): Promise<internal.Contract>

    delete(id: number, sr: ServiceRequest): Promise<number>

    read(id: number, sr: ServiceRequest): Promise<internal.Contract>

    readActiveSystemContact(id: number, sr: ServiceRequest): Promise<internal.Contact>

    readProductByType(type: string, sr: ServiceRequest): Promise<internal.Product>

    readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]>

    update(updates: Dictionary<internal.Contract>, sr: ServiceRequest): Promise<number[]>

}