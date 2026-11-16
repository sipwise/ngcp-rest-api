import {Request} from 'express'

/**
 * Nested filter of a collection read (`contract_id.contact_id.email=foo`), resolved to the ids of `field`
 * before the handler runs. configureQueryBuilder applies it and sets `applied`.
 */
export interface NestedFilter {
    field: string
    // query parameters the filter comes from, as named in the request
    parameters: string[]
    ids: string[]
    applied: boolean
}

const filtersByRequest = new WeakMap<Request, NestedFilter[]>()

export function nestedFilters(req?: Request): NestedFilter[] {
    return (req && filtersByRequest.get(req)) ?? []
}

export function setNestedFilters(req: Request, filters: NestedFilter[]): void {
    filtersByRequest.set(req, filters)
}
