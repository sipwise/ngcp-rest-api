import {ServiceRequest} from '~/interfaces/service-request.interface'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'

export interface ResellerRepository {
    createEmailTemplates(resellerId: number): Promise<void>

    findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]>

    create(resellers: internal.Reseller[], sr: ServiceRequest): Promise<number[]>

    terminate(id: number, sr: ServiceRequest): Promise<number>

    read(id: number, sr: ServiceRequest): Promise<internal.Reseller>

    readByName(name: string, sr: ServiceRequest): Promise<internal.Reseller>

    readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]>

    update(updates: Dictionary<internal.Reseller>, sr: ServiceRequest): Promise<number[]>

    resellerWithContractExists(contractId: number): Promise<boolean>

    contractExists(contractId: number): Promise<boolean>

    contractHasSystemContact(contractId: number): Promise<boolean>

    renameReseller(id: number, name: string): Promise<void>
}
