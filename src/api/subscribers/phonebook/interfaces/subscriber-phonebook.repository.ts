import {SubscriberPhonebookOptions} from './subscriber-phonebook-options.interface'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface SubscriberPhonebookRepository {
    create(sd: internal.SubscriberPhonebook[], sr: ServiceRequest): Promise<number[]>

    readAll(options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<[internal.SubscriberPhonebook[], number]>

    readById(id: number, options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<internal.SubscriberPhonebook>

    update(updates: Dictionary<internal.SubscriberPhonebook>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
