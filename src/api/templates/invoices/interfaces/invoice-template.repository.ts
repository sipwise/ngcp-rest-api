import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface InvoiceTemplateRepository {
    create(sd: internal.InvoiceTemplate[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.InvoiceTemplate[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.InvoiceTemplate>

    update(updates: Dictionary<internal.InvoiceTemplate>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
