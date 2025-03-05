import {CustomerPhonebookOptions} from './customer-phonebook-options.interface'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface CustomerPhonebookRepository {
    create(sd: internal.CustomerPhonebook[], sr: ServiceRequest): Promise<number[]>

    readAll(options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<[internal.CustomerPhonebook[], number]>

    readById(id: number, options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<internal.CustomerPhonebook>

    update(updates: Dictionary<internal.CustomerPhonebook>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
