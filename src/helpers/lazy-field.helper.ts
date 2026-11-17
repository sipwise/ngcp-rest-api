import {NotFoundException} from '@nestjs/common'
import {Request} from 'express'

import {AppService} from '~/app.service'
import {LazyField} from '~/decorators/lazy.decorator'
import {LazyFieldSource, LazyFieldSources, LazyItem} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const INLINE_MAX_ITEMS = 1000
const INLINE_MAX_HARD_LIMIT = 10000
// methods whose responses render lazy fields as links; other requests (writes) work on the full data
export const LAZY_METHODS = [
    'GET',
    'HEAD',
]

type ExpandPaths = Map<string, ExpandPaths>

/**
 * The items one response inlines, shared by its levels (the handler's objects and the expanded ones)
 */
export interface InlineBudget {
    used: number
    // the items the response would inline when its explicitly inlined fields exceed inline_max_hard_limit (422)
    exceeded?: number
}

/**
 * The lazy fields a request inlines, for one level of the response: the handler's response objects, or the
 * objects expanded into `<field>_expand`
 */
export interface InlineRequest {
    all: boolean
    auto: boolean
    // named by `inline=a,b` or by `expand`, capped by inline_max_items
    fields: Set<string>
    budget: InlineBudget
    // the field of a `<item>/@<field>` request; `inline` and `expand` then refer to its item class
    field?: LazyField
    // the expand paths below this level, for the levels of the expanded objects
    expand: ExpandPaths
}

export const NO_INLINE: InlineRequest = Object.freeze({
    all: false,
    auto: false,
    fields: new Set<string>(),
    budget: Object.freeze({used: 0}),
    expand: new Map(),
})

const inlineByRequest = new WeakMap<Request, InlineRequest>()

export function inlineRequest(req?: Request): InlineRequest | undefined {
    return req ? inlineByRequest.get(req) : undefined
}

export function setInlineRequest(req: Request, inline: InlineRequest): void {
    inlineByRequest.set(req, inline)
}

/**
 * The field of a `<item>/@<field>` request; undefined for other requests
 */
export function lazyFieldRequest(req?: Request): LazyField | undefined {
    return inlineRequest(req)?.field
}

/**
 * The inline request of the objects expanded into `<path>_expand`: `all`/`auto` carry over, the names come from
 * the expand paths below it (`expand=customer_id.billing_profiles` inlines `billing_profiles` of the customer)
 */
export function childInlineRequest(inline: InlineRequest, path: string[]): InlineRequest {
    let expand = inline.expand
    for (const segment of path)
        expand = expand.get(segment) ?? new Map()
    return {all: inline.all, auto: inline.auto, fields: new Set(expand.keys()), budget: inline.budget, expand}
}

export function inlineMaxItems(): number {
    return AppService.config.performance?.lazy_load?.inline_max_items ?? INLINE_MAX_ITEMS
}

export function inlineMaxHardLimit(): number {
    return AppService.config.performance?.lazy_load?.inline_max_hard_limit ?? INLINE_MAX_HARD_LIMIT
}

// the inline request of a read that renders lazy fields; undefined for writes and requests without lazy handling
function lazyInlineRequest(req?: Request): InlineRequest | undefined {
    const inline = inlineRequest(req)
    return inline && LAZY_METHODS.includes(req.method) ? inline : undefined
}

/**
 * Whether the request asks for the data of a lazy field (`inline=<field>`, `all`, `auto`, `expand=<field>`);
 * always for writes and requests without lazy handling. The limits are applied by applyLazyFields().
 */
export function isInlined(req: Request | undefined, field: string): boolean {
    const inline = lazyInlineRequest(req)
    return !inline || inline.all || inline.auto || inline.fields.has(field)
}

const placeholderCounts = new WeakMap<object, number>()

/**
 * Value of a lazy array field of a response DTO: the data when loaded, else an empty array that only carries the
 * count (rendered as link, never as data); undefined when neither is known (a field hidden for the role)
 */
export function lazyArray<T>(data: T[] | undefined, totalCount?: number): T[] | undefined {
    if (data !== undefined)
        return data
    if (totalCount === undefined)
        return undefined
    const placeholder: T[] = []
    placeholderCounts.set(placeholder, totalCount)
    return placeholder
}

/**
 * Count of a lazy field value built by lazyArray() without data; undefined for loaded data
 */
export function placeholderCount(value: unknown): number | undefined {
    return typeof value == 'object' && value != null ? placeholderCounts.get(value) : undefined
}

/**
 * Lazy field sources of a service from the maps of its repositories; a field with more than one source is an error
 */
export function mergeLazyFields(...maps: LazyFieldSources[]): LazyFieldSources {
    const merged: LazyFieldSources = {}
    for (const map of maps) {
        for (const [field, source] of Object.entries(map)) {
            if (merged[field])
                throw new Error(`lazy: field ${field} has more than one source`)
            merged[field] = source
        }
    }
    return merged
}

/**
 * Counts the lazy fields of the items read for a response (one count per field for all items) and loads the
 * fields the request inlines within the limits (inlinedItems). The other fields stay undefined, their counts
 * become links. Without a request (reads of the write paths) every field is loaded.
 */
export async function applyLazyFields(items: LazyItem[], sources: LazyFieldSources, sr?: ServiceRequest): Promise<void> {
    if (!items.length)
        return
    const ids = items.map(item => item.id)
    for (const source of Object.values(sources)) {
        const counts = await source.count(ids)
        for (const item of items)
            item.lazyCounts = {...item.lazyCounts, [source.property]: counts.get(item.id) ?? 0}
    }
    const inlined = inlinedItems(items, sources, sr?.req)
    for (const [field, source] of Object.entries(sources)) {
        const fieldItems = inlined.get(field)
        const loaded = fieldItems.length ? await source.load(fieldItems.map(item => item.id)) : new Map<number, unknown[]>()
        const isLoaded = new Set(fieldItems)
        for (const item of items)
            item[source.property] = isLoaded.has(item) ? loaded.get(item.id) ?? [] : undefined
    }
}

/**
 * The items whose field is loaded, by field, decided on the counts: all of them without lazy handling. Else
 * first the explicitly inlined fields (`inline=<field>`, `all`, `expand`) of the items within inline_max_items;
 * if together with what the response inlined so far they exceed inline_max_hard_limit, nothing is loaded and
 * the response is 422. Then `auto` in page order: each field of an item within inline_max_items and what is
 * left of the hard limit, the others stay links.
 */
function inlinedItems(items: LazyItem[], sources: LazyFieldSources, req?: Request): Map<string, LazyItem[]> {
    const fields = Object.keys(sources)
    const inline = lazyInlineRequest(req)
    if (!inline)
        return new Map(fields.map(field => [field, items]))
    const inlined = new Map(fields.map(field => [field, [] as LazyItem[]]))
    const explicit = fields.filter(field => inline.all || inline.fields.has(field))
    if (!explicit.length && !inline.auto)
        return inlined
    const count = (item: LazyItem, field: string): number => item.lazyCounts[sources[field].property]
    const max = inlineMaxItems()
    const hardLimit = inlineMaxHardLimit()
    const budget = inline.budget
    let explicitTotal = 0
    for (const field of explicit) {
        for (const item of items.filter(item => count(item, field) <= max)) {
            inlined.get(field).push(item)
            explicitTotal += count(item, field)
        }
    }
    if (budget.used + explicitTotal > hardLimit) {
        budget.exceeded = budget.used + explicitTotal
        return new Map(fields.map(field => [field, [] as LazyItem[]]))
    }
    budget.used += explicitTotal
    if (!inline.auto)
        return inlined
    const autoFields = fields.filter(field => !explicit.includes(field))
    for (const item of items) {
        for (const field of autoFields) {
            const itemCount = count(item, field)
            if (itemCount <= max && budget.used + itemCount <= hardLimit) {
                inlined.get(field).push(item)
                budget.used += itemCount
            }
        }
    }
    return inlined
}

/**
 * `<item>/@<field>`: a page of the field's items. The item is read without its lazy fields; a field its response
 * leaves out (hidden for the role or the item) is 404.
 * @param toResponse response DTO of the item for the caller
 */
export async function readLazyField<T extends LazyItem>(
    item: T,
    field: string,
    sources: LazyFieldSources,
    sr: ServiceRequest,
    toResponse: (item: T) => object,
): Promise<[unknown[], number]> {
    const source = sources[field]
    // with a count the response shows the field as a link unless it hides it; the count itself is not needed
    item.lazyCounts = {[source.property]: 0}
    if (toResponse(item)[field] === undefined)
        throw new NotFoundException()
    return await source.page(item.id, sr)
}

/**
 * Source of a lazy field kept in memory on the entities themselves (mock repositories): no filters or paging
 */
export function memoryFieldSource(property: string, read: (id: number) => object | undefined): LazyFieldSource {
    const items = (id: number): unknown[] => (read(id) as Record<string, unknown[]>)?.[property] ?? []
    return {
        property,
        count: async ids => new Map(ids.map(id => [id, items(id).length])),
        load: async ids => new Map(ids.map(id => [id, items(id)])),
        page: async id => [items(id), items(id).length],
    }
}
