import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface CustomerRepository {
    // sources of billing_profiles, future_billing_profiles; the reads leave these fields unset
    readonly lazyFields: LazyFieldSources

    create(sd: internal.Customer[], sr: ServiceRequest): Promise<number[]>

    readAll(sr: ServiceRequest): Promise<[internal.Customer[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.Customer>

    /**
     * The customer's contract row without details (actual billing profile, profile definition)
     */
    readBareById(id: number, sr: ServiceRequest): Promise<internal.Customer>

    update(updates: Dictionary<internal.Customer>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>
}
