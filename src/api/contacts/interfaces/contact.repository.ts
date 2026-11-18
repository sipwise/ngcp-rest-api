import {ContactOptions} from './contact-options.interface'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ContactRepository {
    create(contacts: internal.Contact[], sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

    terminate(ids: number[], sr: ServiceRequest): Promise<number[]>

    readById(id: number, options: ContactOptions): Promise<internal.Contact>

    readWhereInIds(ids: number[], options: ContactOptions): Promise<internal.Contact[]>

    readExistingResellerIds(ids: number[]): Promise<number[]>

    readIdsWithActiveContract(ids: number[]): Promise<number[]>

    readIdsWithTerminatedContract(ids: number[]): Promise<number[]>

    readIdsWithActiveSubscriber(ids: number[]): Promise<number[]>

    readIdsWithTerminatedSubscriber(ids: number[]): Promise<number[]>

    readAll(sr: ServiceRequest, options?: ContactOptions): Promise<[internal.Contact[], number]>

    update(updates: Dictionary<internal.Contact>, options: ContactOptions): Promise<number[]>
}
