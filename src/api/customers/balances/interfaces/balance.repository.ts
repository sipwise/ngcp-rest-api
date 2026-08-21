import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface CustomerBalanceRepository {
    readAll(sr: ServiceRequest): Promise<[internal.ContractBalance[], number]>
    readById(id: number, sr: ServiceRequest): Promise<internal.ContractBalance>
    update(updates: Dictionary<internal.ContractBalance>, sr: ServiceRequest): Promise<number[]>
}
