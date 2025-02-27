import {ResellerPhonebookOptions} from './reseller-phonebook-options.interface'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ResellerPhonebookRepository {
    create(sd: internal.ResellerPhonebook[], sr: ServiceRequest): Promise<number[]>

    readAll(options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<[internal.ResellerPhonebook[], number]>

    readById(id: number, options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<internal.ResellerPhonebook>

    update(updates: Dictionary<internal.ResellerPhonebook>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
