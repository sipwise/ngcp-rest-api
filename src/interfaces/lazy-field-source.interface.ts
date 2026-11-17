import {ServiceRequest} from './service-request.interface'

/**
 * Item counts of the lazy fields of an internal entity by the property holding the field's data
 */
export type LazyCounts = Record<string, number>

/**
 * Internal entity with lazy fields
 */
export interface LazyItem {
    id?: number
    lazyCounts?: LazyCounts
}

/**
 * Store of a lazy array field: counts, loads and pages the field's items by the id of the entity owning them.
 * Each lazy field has exactly one source, exposed by the repository that stores it (`lazyFields`).
 */
export interface LazyFieldSource<T = unknown> {
    // property of the internal entity holding the loaded items
    property: string
    // search DTO of the `<item>/@<field>` collection (filters, order_by)
    search?: new () => object
    count(itemIds: number[]): Promise<Map<number, number>>
    // all items of the entities, for inlined fields
    load(itemIds: number[]): Promise<Map<number, T[]>>
    // `<item>/@<field>`: the page of the request's filters, order and paging, and the total count
    page(itemId: number, sr: ServiceRequest): Promise<[T[], number]>
}

/**
 * Sources of the lazy fields by response field name
 */
export type LazyFieldSources = Record<string, LazyFieldSource>
