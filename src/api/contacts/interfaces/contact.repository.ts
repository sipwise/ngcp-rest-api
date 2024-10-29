import {ContactOptions} from './contact-options.interface'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ContactRepository {
    create(contacts: internal.Contact[], sr: ServiceRequest): Promise<number[]>

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
