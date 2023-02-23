import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'
import {ContactOptions} from './contact-options.interface'
import {Dictionary} from '../../../helpers/dictionary.helper'

export interface ContactRepository {
    create(entity: internal.Contact, sr: ServiceRequest): Promise<internal.Contact>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

    terminate(id: number, sr: ServiceRequest): Promise<number>

    readById(id: number, options: ContactOptions): Promise<internal.Contact>

    readWhereInIds(ids: number[], options: ContactOptions): Promise<internal.Contact[]>

    readResellerById(id: number, sr: ServiceRequest): Promise<internal.Reseller>

    hasContactActiveContract(contactId: number, sr: ServiceRequest): Promise<boolean>

    hasContactTerminatedContract(contactId: number, sr: ServiceRequest): Promise<boolean>

    hasContactActiveSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean>

    hasContactTerminatedSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean>

    readAll(sr: ServiceRequest, options?: ContactOptions): Promise<[internal.Contact[], number]>

    update(updates: Dictionary<internal.Contact>, options: ContactOptions): Promise<number[]>
}