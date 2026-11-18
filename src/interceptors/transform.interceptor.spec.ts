import {CallHandler, ExecutionContext} from '@nestjs/common'
import {Request} from 'express'
import {lastValueFrom, of} from 'rxjs'

import {TransformInterceptor, halRelName} from './transform.interceptor'

import {NO_INLINE, setInlineRequest} from '~/helpers/lazy-field.helper'

const HAL = 'application/hal+json'
const RULES_PATH = '/api/header-manipulations/sets{/:setId}/rules'
const RULES_URL = '/api/header-manipulations/sets/5/rules'
const RULES_REL = 'ngcp:header-manipulations/sets/rules'

interface Link {
    href: string
}

interface HalBody {
    _links: Record<string, Link | Link[]>
    _embedded?: Record<string, {id?: number, _links?: Record<string, Link>}[]>
    [key: string]: unknown
}

describe('TransformInterceptor', () => {
    const interceptor = new TransformInterceptor({pageName: 'page', perPageName: 'rows'})

    const transform = async (
        path: string,
        url: string,
        data: unknown,
        headers: Record<string, string> = {accept: HAL},
        setup?: (req: Request) => void,
    ): Promise<HalBody> => {
        const req = {method: 'GET', route: {path}, url, originalUrl: url, query: {}, headers} as unknown as Request
        setup?.(req)
        const res = {setHeader: jest.fn(), status: jest.fn()}
        const context = {
            switchToHttp: (): object => ({getRequest: (): Request => req, getResponse: (): object => res}),
        } as unknown as ExecutionContext
        const next: CallHandler = {handle: () => of(data)}
        return JSON.parse(JSON.stringify(await lastValueFrom(interceptor.intercept(context, next)))) as HalBody
    }

    describe('halRelName', () => {
        it('drops the prefix, optional-group braces and parameters', () => {
            expect(halRelName('/api/admins')).toBe('admins')
            expect(halRelName('/api/v2/admins/:id')).toBe('admins')
            expect(halRelName('/api/header-manipulations/sets/{:setId/}rules{/:ruleId}/conditions'))
                .toBe('header-manipulations/sets/rules/conditions')
            expect(halRelName('/api/customers/:id/journal')).toBe('customers/journal')
        })
    })

    describe('collections', () => {
        it('embeds items with their own self link, matching the item link list', async () => {
            const body = await transform(RULES_PATH, RULES_URL, [[{id: 1}, {id: 2}], 2])
            const self = (id: number): Link => ({href: `${RULES_URL}/${id}`})
            expect(Object.keys(body._embedded)).toEqual([RULES_REL])
            expect(body._links[RULES_REL]).toEqual([self(1), self(2)])
            expect(body._embedded[RULES_REL].map(item => item._links)).toEqual([{self: self(1)}, {self: self(2)}])
            expect(body._links.self).toEqual({href: RULES_URL})
            expect(body._links.collection).toEqual({href: RULES_URL})
            expect(body.total_count).toBe(2)
        })

        it('keeps the item link list an array for a single item', async () => {
            const body = await transform(RULES_PATH, RULES_URL, [[{id: 1}], 1])
            expect(body._links[RULES_REL]).toEqual([{href: `${RULES_URL}/1`}])
        })

        it('gives rows without an id neither an item link nor a self link', async () => {
            const body = await transform('/api/pbx', '/api/pbx', [[{name: 'a'}, {id: null, name: 'b'}], 2])
            expect(body._links).not.toHaveProperty('ngcp:pbx')
            expect(body._embedded['ngcp:pbx']).toEqual([{name: 'a'}, {id: null, name: 'b'}])
        })

        it('names `@<field>` collections after the field, without item links', async () => {
            const url = '/api/things/1/@entries'
            const body = await transform('/api/things/:id/@:field', url, [[{id: 7}], 1], {accept: HAL}, req =>
                setInlineRequest(req, {...NO_INLINE, field: {field: 'entries', linkOnly: false, isArray: true}}),
            )
            expect(Object.keys(body._embedded)).toEqual(['ngcp:entries'])
            expect(body._links).not.toHaveProperty('ngcp:entries')
            expect(body._embedded['ngcp:entries']).toEqual([{id: 7}])
        })

        it('returns plain JSON when only application/json is accepted', async () => {
            const body = await transform(RULES_PATH, RULES_URL, [[{id: 1}], 1], {accept: 'application/json'})
            expect(body).toEqual({data: [{id: 1}], total_count: 1})
        })
    })

    describe('single items', () => {
        it('links an item to itself and its collection', async () => {
            const url = `${RULES_URL}/3`
            const body = await transform(`${RULES_PATH}/:id`, url, {id: 3})
            expect(body._links).toEqual({self: {href: url}, collection: {href: RULES_URL}})
        })

        it('links a response without an id to itself only', async () => {
            const url = `${RULES_URL}/3`
            const body = await transform(`${RULES_PATH}/:id`, url, {id: 3}, {accept: HAL, prefer: 'return=id'})
            expect(body.ids).toEqual([3])
            expect(body._links).toEqual({self: {href: url}})
        })
    })
})
