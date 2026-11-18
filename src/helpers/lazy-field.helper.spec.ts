import {NotFoundException} from '@nestjs/common'
import {Request} from 'express'

import {
    InlineRequest,
    applyLazyFields,
    childInlineRequest,
    inlineRequest,
    mergeLazyFields,
    readLazyField,
    setInlineRequest,
} from './lazy-field.helper'

import {AppService} from '~/app.service'
import {LazyCounts, LazyFieldSource, LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface Owner {
    id: number
    entries?: string[]
    tags?: string[]
    lazyCounts?: LazyCounts
}

const stored: Record<number, Pick<Owner, 'entries' | 'tags'>> = {
    1: {entries: ['a', 'b'], tags: ['x']},
    2: {entries: ['c', 'd', 'e'], tags: []},
    3: {entries: ['f'], tags: ['y', 'z']},
}

// a source over `stored` that records its calls
function source(property: 'entries' | 'tags', calls: string[]): LazyFieldSource {
    const items = (id: number): string[] => stored[id]?.[property] ?? []
    return {
        property,
        count: (ids): Promise<Map<number, number>> => {
            calls.push(`count ${property} ${ids}`)
            return Promise.resolve(new Map(ids.filter(id => items(id).length).map(id => [id, items(id).length])))
        },
        load: (ids): Promise<Map<number, unknown[]>> => {
            calls.push(`load ${property} ${ids}`)
            return Promise.resolve(new Map(ids.filter(id => items(id).length).map(id => [id, items(id)])))
        },
        page: (id): Promise<[unknown[], number]> => {
            calls.push(`page ${property} ${id}`)
            return Promise.resolve([items(id).slice(0, 1), items(id).length])
        },
    }
}

function sr(method: string, inline?: Partial<InlineRequest>): ServiceRequest {
    const req = {method} as Request
    if (inline)
        setInlineRequest(req, {all: false, auto: false, fields: new Set(), budget: {used: 0}, expand: new Map(), ...inline})
    return {req, query: {}, params: {}, user: {}, headers: [undefined], returnContent: false}
}

const owners = (): Owner[] => [{id: 1}, {id: 2}]

describe('lazy field sources', () => {
    let calls: string[]
    let sources: LazyFieldSources
    const savedPerformance = AppService.config.performance

    beforeEach(() => {
        calls = []
        sources = {entries: source('entries', calls), tags: source('tags', calls)}
    })

    afterEach(() => {
        AppService.config.performance = savedPerformance
    })

    describe('mergeLazyFields', () => {
        it('merges the sources of the repositories', () => {
            expect(Object.keys(mergeLazyFields({entries: sources.entries}, {tags: sources.tags}))).toEqual(['entries', 'tags'])
        })

        it('fails on a field with two sources', () => {
            expect(() => mergeLazyFields({entries: sources.entries}, {entries: sources.tags})).toThrow(/entries has more than one source/)
        })
    })

    describe('applyLazyFields', () => {
        it('counts every field once per page and loads none that is not inlined', async () => {
            const items = owners()
            await applyLazyFields(items, sources, sr('GET', {}))
            expect(calls).toEqual(['count entries 1,2', 'count tags 1,2'])
            expect(items).toEqual([
                {id: 1, entries: undefined, tags: undefined, lazyCounts: {entries: 2, tags: 1}},
                {id: 2, entries: undefined, tags: undefined, lazyCounts: {entries: 3, tags: 0}},
            ])
        })

        it('loads the inlined fields in one go for all items', async () => {
            const items = owners()
            await applyLazyFields(items, sources, sr('GET', {fields: new Set(['entries'])}))
            expect(calls).toEqual(['count entries 1,2', 'count tags 1,2', 'load entries 1,2'])
            expect(items.map(item => item.entries)).toEqual([['a', 'b'], ['c', 'd', 'e']])
            expect(items.map(item => item.tags)).toEqual([undefined, undefined])
        })

        it('loads only the items within inline_max_items', async () => {
            AppService.config.performance = {lazy_load: {inline_max_items: 2}}
            const items = owners()
            await applyLazyFields(items, sources, sr('GET', {auto: true}))
            expect(calls).toContain('load entries 1')
            expect(items.map(item => item.entries)).toEqual([['a', 'b'], undefined])
            expect(items[1].lazyCounts.entries).toBe(3)
        })

        describe('inline_max_hard_limit', () => {
            const items = (): Owner[] => [{id: 1}, {id: 2}, {id: 3}]
            const loaded = (owners: Owner[], property: 'entries' | 'tags'): number[] =>
                owners.filter(owner => owner[property]).map(owner => owner.id)

            beforeEach(() => {
                AppService.config.performance = {lazy_load: {inline_max_items: 3, inline_max_hard_limit: 6}}
            })

            it('auto inlines in page order while the response stays within the limit, the rest links', async () => {
                const owners = items()
                const request = sr('GET', {auto: true})
                await applyLazyFields(owners, sources, request)
                // row 1: entries 2 + tags 1, row 2: entries 3 + tags 0, 6 in all; nothing of row 3 fits
                expect(loaded(owners, 'entries')).toEqual([1, 2])
                expect(loaded(owners, 'tags')).toEqual([1, 2])
                expect(owners[2].lazyCounts).toEqual({entries: 1, tags: 2})
                expect(inlineRequest(request.req).budget).toEqual({used: 6})
            })

            it('loads nothing when the explicitly inlined fields exceed the limit', async () => {
                const owners = items()
                const request = sr('GET', {all: true})
                await applyLazyFields(owners, sources, request)
                expect(calls.filter(call => call.startsWith('load'))).toEqual([])
                expect(inlineRequest(request.req).budget).toEqual({used: 0, exceeded: 9})
            })

            it('leaves out items above inline_max_items from the explicit total, the interceptor rejects them', async () => {
                AppService.config.performance = {lazy_load: {inline_max_items: 2, inline_max_hard_limit: 6}}
                const owners = items()
                await applyLazyFields(owners, sources, sr('GET', {fields: new Set(['entries'])}))
                expect(loaded(owners, 'entries')).toEqual([1, 3])
            })

            it('gives the explicitly inlined fields precedence over auto', async () => {
                const owners = items()
                const request = sr('GET', {auto: true, fields: new Set(['entries'])})
                await applyLazyFields(owners, sources, request)
                expect(loaded(owners, 'entries')).toEqual([1, 2, 3])
                // 6 used by entries, nothing left for tags
                expect(loaded(owners, 'tags')).toEqual([2])
            })

            it('counts the expanded objects against the same response', async () => {
                const request = sr('GET', {auto: true})
                await applyLazyFields([{id: 2}], sources, request)
                const expandRequest = sr('GET')
                setInlineRequest(expandRequest.req, childInlineRequest(inlineRequest(request.req), ['owner_id']))
                const expanded: Owner[] = [{id: 1}, {id: 3}]
                await applyLazyFields(expanded, sources, expandRequest)
                // 3 used by the handler's row, 3 left: entries 2 + tags 1 of row 1
                expect(loaded(expanded, 'entries')).toEqual([1])
                expect(loaded(expanded, 'tags')).toEqual([1])
                expect(inlineRequest(request.req).budget).toEqual({used: 6})
            })
        })

        it('gives an empty list to a loaded item without rows', async () => {
            const items = owners()
            await applyLazyFields(items, sources, sr('GET', {all: true}))
            expect(items[1].tags).toEqual([])
        })

        it('loads everything without a request (write paths) and for writes', async () => {
            for (const request of [undefined, sr('PUT', {})]) {
                const items = owners()
                await applyLazyFields(items, sources, request)
                expect(items.map(item => [item.entries, item.tags])).toEqual([[['a', 'b'], ['x']], [['c', 'd', 'e'], []]])
            }
        })

        it('does nothing without items', async () => {
            await applyLazyFields([], sources, sr('GET', {}))
            expect(calls).toEqual([])
        })
    })

    describe('readLazyField', () => {
        const toResponse = (owner: Owner): object => ({
            entries: owner.lazyCounts?.entries !== undefined ? [] : undefined,
            // hidden for owner 2
            tags: owner.id == 1 && owner.lazyCounts?.tags !== undefined ? [] : undefined,
        })

        it('reads the page of the field only', async () => {
            expect(await readLazyField({id: 2}, 'entries', sources, sr('GET'), toResponse)).toEqual([['c'], 3])
            expect(calls).toEqual(['page entries 2'])
        })

        it('is 404 for a field the response leaves out, without reading it', async () => {
            await expect(readLazyField({id: 2}, 'tags', sources, sr('GET'), toResponse)).rejects.toThrow(NotFoundException)
            expect(calls).toEqual([])
        })
    })
})
