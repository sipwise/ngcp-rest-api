import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {db, internal} from '../../../entities'

export interface ResellersRepository {
    createEmailTemplates(resellerId: number): Promise<void>

    findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]>

    create(reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller>

    terminate(id: number, sr: ServiceRequest): Promise<number>

    read(id: number, sr: ServiceRequest): Promise<internal.Reseller>

    readByName(name: string, sr: ServiceRequest): Promise<internal.Reseller>

    readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]>

    update(id: number, reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller>

    resellerWithContractExists(contractId: number): Promise<boolean>

    contractExists(contractId: number): Promise<boolean>

    contractHasSystemContact(contractId: number): Promise<boolean>

    renameReseller(id: number, name: string): Promise<void>
}