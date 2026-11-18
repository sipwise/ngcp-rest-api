import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

// a contract a reseller may be created with, if it has a system contact and no reseller yet
export interface ResellerContract {
    id: number
    hasSystemContact: boolean
    hasReseller: boolean
}

export interface ResellerRepository {
    createEmailTemplates(resellerId: number): Promise<void>

    findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]>

    create(resellers: internal.Reseller[], sr: ServiceRequest): Promise<number[]>

    terminate(id: number, sr: ServiceRequest): Promise<number>

    read(id: number, sr: ServiceRequest): Promise<internal.Reseller>

    readByNames(names: string[]): Promise<internal.Reseller[]>

    readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]>

    update(updates: Dictionary<internal.Reseller>, sr: ServiceRequest): Promise<number[]>

    readResellerContracts(contractIds: number[]): Promise<ResellerContract[]>

    renameResellers(ids: number[]): Promise<void>
}
