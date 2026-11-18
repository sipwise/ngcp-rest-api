import {CallHandler, Controller, ExecutionContext, Get, HttpStatus, SetMetadata, Type} from '@nestjs/common'
import {ApplicationConfig, DiscoveryService, Reflector} from '@nestjs/core'
import {ApiProperty} from '@nestjs/swagger'
import {Request} from 'express'
import {defer, lastValueFrom, of} from 'rxjs'
import {BaseEntity, SelectQueryBuilder} from 'typeorm'

import {ExpandInterceptor, parseExpand, resourcePaths} from './expand.interceptor'

import {AppService} from '~/app.service'
import {reservedQueryParamKeys} from '~/config/constants.config'
import {expandConfig} from '~/config/expand.config'
import {Expand, NoExpand, expandDeclarations, modelFieldTarget} from '~/decorators/expand.decorator'
import {ResponseModel} from '~/decorators/response-model.decorator'
import {ApiErrorException, InvalidParameterException} from '~/helpers/errors.helper'
import {NestedFilter, nestedFilters, setNestedFilters} from '~/helpers/nested-filter.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LicenseService} from '~/license/license.service'

type Row = {id: number}

interface Collection {
    path: string
    calls: string[][]
    queries: Record<string, unknown>[]
    controller: object
    type: object
}

class OwnerDto {
    @ApiProperty()
        id: number
    @ApiProperty()
        email: string

    constructor(id: number, email = `${id}@example.com`) {
        this.id = id
        this.email = email
    }
}

class ThingDto {
    @ApiProperty()
        id: number
    @Expand('owners')
    @ApiProperty()
        owner_id: number | null
    @ApiProperty()
        status: string

    constructor(id: number, ownerId: number | null = null, status = 'active') {
        this.id = id
        this.owner_id = ownerId
        this.status = status
    }
}

class ListDto {
    @ApiProperty()
        id: number
    @ApiProperty()
        name: string
    @Expand('things')
    @ApiProperty()
        thing_id: number
}

class RowDto {
    @ApiProperty()
        id: number
}

class NestedDto {
    @Expand('things')
    @ApiProperty()
        ref_id: number

    constructor(refId: number) {
        this.ref_id = refId
    }
}

class ItemDto {
    @ApiProperty()
        id: number
    @ApiProperty()
        name = 'item'
    @Expand('things')
    @ApiProperty()
        thing_id: number | null
    @Expand('things')
    @ApiProperty()
        other_thing_id?: number | null
    @Expand('things')
    @ApiProperty()
        thing_ids?: number[]
    @NoExpand()
    @ApiProperty()
        contract_id?: number
    @ApiProperty()
        reseller_id?: number
    @ApiProperty({type: [NestedDto]})
        nested?: NestedDto[]

    constructor(values: Partial<ItemDto>) {
        Object.assign(this, values)
    }
}

interface CollectionOptions {
    roles?: string[]
    licenses?: string[]
    scope?: (row: Row) => boolean
    // null: a readAll without response class
    model?: Type<unknown> | null
    searchable?: string[]
    // a repository without configureQueryBuilder: nested filters stay unapplied
    ignoresFilters?: boolean
}

function collection(path: string, rows: Row[], options: CollectionOptions = {}): Collection {
    const calls: string[][] = []
    const queries: Record<string, unknown>[] = []

    @Controller(path)
    class FakeController {
        @Get()
        readAll(req: Request): Promise<[Row[], number]> {
            const query = req.query as Record<string, string>
            queries.push({...query, method: req.method, params: req.params, url: req.url})
            let found = rows.filter(row => options.scope?.(row) ?? true)
            if (query.id != undefined) {
                const ids = query.id.split(',')
                calls.push(ids)
                found = found.filter(row => ids.includes(String(row.id)))
            }
            for (const [key, value] of Object.entries(query)) {
                if (key == 'id' || reservedQueryParamKeys.includes(key) || key.includes('.'))
                    continue
                if (!options.searchable?.includes(key))
                    throw new InvalidParameterException([{parameter: key, code: 'whitelistValidation', message: `parameter ${key} should not exist`}])
                found = found.filter(row => String(row[key]) == value)
            }
            for (const filter of options.ignoresFilters ? [] : nestedFilters(req)) {
                found = found.filter(row => filter.ids.includes(String(row[filter.field])))
                filter.applied = true
            }
            // fresh objects per read, like a controller building its response DTOs
            const page = found
                .slice(0, +(query.rows ?? 10))
                .map(row => Object.assign(Object.create(Object.getPrototypeOf(row)), row) as Row)
            return Promise.resolve([page, found.length])
        }
    }
    if (options.model !== null) {
        const prototype = FakeController.prototype
        ResponseModel(options.model ?? RowDto)(prototype, 'readAll', Object.getOwnPropertyDescriptor(prototype, 'readAll'))
    }
    if (options.roles)
        Reflect.defineMetadata('rbacroles', options.roles, FakeController)
    if (options.licenses)
        Reflect.defineMetadata('licenses', options.licenses, FakeController)
    return {path, calls, queries, controller: new FakeController(), type: FakeController}
}

const appConfig = {getGlobalPrefix: (): string => 'api'} as unknown as ApplicationConfig

function interceptorFor(collections: Collection[], licenseActive = true): ExpandInterceptor {
    // every global mapping target must exist at startup
    const globalTargets = [...new Set(Object.values(expandConfig).map(rule => rule.target))]
        .filter(target => !collections.some(c => c.path == target))
        .map(target => collection(target, []))
    const discovery = {
        getControllers: () => [...collections, ...globalTargets].map(c => ({instance: c.controller, metatype: c.type})),
    } as unknown as DiscoveryService
    const licenses = {areLicensesActive: (): Promise<boolean> => Promise.resolve(licenseActive)} as unknown as LicenseService
    const interceptor = new ExpandInterceptor(discovery, new Reflector(), licenses, appConfig)
    interceptor.onModuleInit()
    return interceptor
}

function request(query: Record<string, unknown> = {}, role = 'admin', method = 'GET', accept?: string): Request {
    // the client's single Accept type, or the route's first type without one
    const accepts = (types: string[]): string | false => accept ? types.includes(accept) && accept : types[0]
    return {query, method, params: {}, headers: accept ? {accept} : {}, user: {role}, accepts} as unknown as Request
}

async function expandError(promise: Promise<unknown>): Promise<ApiErrorException> {
    try {
        await promise
    } catch (err) {
        return err as ApiErrorException
    }
    throw new Error('expected an error')
}

@Controller('items')
class ItemController {}

class ItemHandlers {
    @ResponseModel(ItemDto)
    readAll(): [ItemDto[], number] {
        return [[], 0]
    }

    @ResponseModel(ListDto)
    readList(): [ListDto[], number] {
        return [[], 0]
    }

    // a file download, no response class
    readFile(): void {
        return
    }

    // JSON, or a CSV export with Accept: text/csv
    @ResponseModel(ItemDto)
    @SetMetadata('validAccepts', ['application/json', 'text/csv', '*/*'])
    readCsv(): void {
        return
    }
}

describe('ExpandInterceptor', () => {
    let things: Collection
    let owners: Collection
    let interceptor: ExpandInterceptor

    const run = async (
        req: Request,
        data: unknown | ((req: Request) => unknown),
        controller: object = ItemController,
        handler: object = ItemHandlers.prototype.readAll,
    ): Promise<unknown> => {
        const context = {
            getType: (): string => 'http',
            getClass: (): object => controller,
            getHandler: (): object => handler,
            switchToHttp: (): object => ({getRequest: (): Request => req}),
        } as unknown as ExecutionContext
        const next: CallHandler = {
            handle: () => defer(() => of(typeof data == 'function' ? (data as (req: Request) => unknown)(req) : data)),
        }
        return lastValueFrom(interceptor.intercept(context, next))
    }

    // GET of ItemDto objects with expand=<value>
    const expand = async (items: object[], value: string, soft = false, role = 'admin', query = {}): Promise<void> => {
        await run(request({...query, expand: value, ...soft ? {soft_expand: '1'} : {}}, role), items)
    }

    beforeEach(() => {
        owners = collection('owners', [new OwnerDto(10), new OwnerDto(11)], {roles: ['admin', 'system'], model: OwnerDto, searchable: ['email']})
        things = collection('things', [new ThingDto(1, 10), new ThingDto(2, 11), new ThingDto(3, 10, 'locked')], {model: ThingDto, searchable: ['status', 'owner_id']})
        interceptor = interceptorFor([things, owners])
    })

    describe('parseExpand', () => {
        it('parses a comma list of dotted paths into a tree', () => {
            const request = parseExpand('a, b.c,b.d,a')
            expect([...request.paths.keys()]).toEqual(['a', 'b'])
            expect([...request.paths.get('b').keys()]).toEqual(['c', 'd'])
            expect(request.all).toBe(false)
        })

        it('joins repeated parameters and recognises all', () => {
            const request = parseExpand(['all', 'a.b'])
            expect(request.all).toBe(true)
            expect([...request.paths.keys()]).toEqual(['a'])
        })

        it('returns undefined when nothing is requested', () => {
            expect(parseExpand('')).toBeUndefined()
            expect(parseExpand(' , ')).toBeUndefined()
        })

        it.each(['a..b', '.a', 'a.'])('rejects the empty path segment in %s with 400', async value => {
            const err = await expandError(Promise.resolve().then(() => parseExpand(value)))
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_INVALID_PATH', message: `Invalid path ${value}`})
        })

        it('rejects non-string values with 400', async () => {
            const err = await expandError(Promise.resolve().then(() => parseExpand({a: '1'})))
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList[0].code).toEqual('EXPAND_INVALID_PATH')
        })
    })

    describe('mapping', () => {
        it('derives resource paths without optional groups and skips parameter paths', () => {
            @Controller('sets')
            class RuleController {
                @Get('{:setId/}rules{/:ruleId}/actions')
                readAll(): void {
                    return
                }

                @Get(':id')
                read(): void {
                    return
                }
            }
            expect(resourcePaths(RuleController, RuleController.prototype.readAll)).toEqual(['sets/rules/actions'])
            expect(resourcePaths(RuleController, RuleController.prototype.read)).toEqual([])
        })

        it('takes @Expand() over the global mapping, @NoExpand() opts out, the mapping needs the field', () => {
            expect(modelFieldTarget(ItemDto, 'thing_id')).toEqual('things')
            expect(modelFieldTarget(ItemDto, 'contract_id')).toBeUndefined()
            expect(modelFieldTarget(ItemDto, 'reseller_id')).toEqual(expandConfig.reseller_id.target)
            expect(modelFieldTarget(ItemDto, 'name')).toBeUndefined()
            expect(modelFieldTarget(OwnerDto, 'reseller_id')).toBeUndefined()
        })

        it('fails at startup on an unknown @Expand() target', () => {
            class BrokenDto {
                @Expand('no-such-collection')
                    broken_id: number
            }
            try {
                expect(() => interceptorFor([things, owners])).toThrow(/BrokenDto broken_id: target 'no-such-collection'/)
            } finally {
                expandDeclarations.splice(expandDeclarations.findIndex(d => d.type == BrokenDto), 1)
            }
        })

        it('fails at startup when a global mapping target has no readAll', () => {
            const discovery = {getControllers: () => [things, owners].map(c => ({instance: c.controller, metatype: c.type}))} as unknown as DiscoveryService
            const broken = new ExpandInterceptor(discovery, new Reflector(), {} as LicenseService, appConfig)
            expect(() => broken.onModuleInit()).toThrow(/expand\.config/)
        })

        it('fails at startup when a target has no response model', () => {
            things = collection('things', [], {model: null})
            expect(() => interceptorFor([things, owners])).toThrow(/target 'things' has no response model/)
        })
    })

    describe('walker', () => {
        it('expands a collection with one batched read per path, deduped, null ids as null', async () => {
            const items = [
                new ItemDto({id: 1, thing_id: 1}),
                new ItemDto({id: 2, thing_id: 2}),
                new ItemDto({id: 3, thing_id: 1}),
                new ItemDto({id: 4, thing_id: null}),
            ]
            await expand(items, 'thing_id')
            expect(things.calls).toEqual([['1', '2']])
            expect(items.map(item => (item['thing_id_expand'] as ThingDto)?.id ?? null)).toEqual([1, 2, 1, null])
            expect('thing_id_expand' in items[3]).toBe(true)
        })

        it('reads in chunks of 500 ids', async () => {
            const rows = Array.from({length: 1201}, (_, i) => new ThingDto(i + 1))
            things = collection('things', rows)
            interceptor = interceptorFor([things, owners])
            const items = rows.map(row => new ItemDto({id: row.id, thing_id: row.id}))
            await expand(items, 'thing_id')
            expect(things.calls.map(ids => ids.length)).toEqual([500, 500, 201])
            expect(things.queries[0]).toMatchObject({page: '1', rows: '500', method: 'GET', params: {}, url: '/api/things'})
            expect(items.every(item => (item['thing_id_expand'] as ThingDto).id == item.id)).toBe(true)
        })

        it('expands id arrays in order', async () => {
            const items = [new ItemDto({id: 1, thing_ids: [2, 1]}), new ItemDto({id: 2, thing_ids: []})]
            await expand(items, 'thing_ids')
            expect((items[0]['thing_ids_expand'] as ThingDto[]).map(thing => thing.id)).toEqual([2, 1])
            expect(items[1]['thing_ids_expand']).toEqual([])
            expect(things.calls).toEqual([['2', '1']])
        })

        it('descends into nested objects', async () => {
            const items = [new ItemDto({id: 1, nested: [new NestedDto(3), new NestedDto(1)]}), new ItemDto({id: 2, nested: []})]
            await expand(items, 'nested.ref_id')
            expect(items[0].nested.map(nested => (nested['ref_id_expand'] as ThingDto).id)).toEqual([3, 1])
            expect('nested_expand' in items[0]).toBe(false)
        })

        it('expands depth 2 with one read per level', async () => {
            const items = [new ItemDto({id: 1, thing_id: 1}), new ItemDto({id: 2, thing_id: 3}), new ItemDto({id: 3, thing_id: 2})]
            await expand(items, 'thing_id.owner_id')
            expect(things.calls).toEqual([['1', '3', '2']])
            expect(owners.calls).toEqual([['10', '11']])
            const owner = (item: ItemDto): number => ((item['thing_id_expand'] as ThingDto)['owner_id_expand'] as OwnerDto).id
            expect(items.map(owner)).toEqual([10, 10, 11])
        })

        it('keeps expansions per path', async () => {
            const items = [new ItemDto({id: 1, thing_id: 1, other_thing_id: 1})]
            await expand(items, 'thing_id,other_thing_id.owner_id')
            expect(things.calls).toHaveLength(2)
            expect('owner_id_expand' in (items[0]['thing_id_expand'] as object)).toBe(false)
            expect((items[0]['other_thing_id_expand'] as ThingDto)['owner_id_expand']).toBeDefined()
        })

        it('carries tz into the target read', async () => {
            await expand([new ItemDto({id: 1, thing_id: 1})], 'thing_id', false, 'admin', {tz: 'owner', foo: 'bar'})
            expect(things.queries[0]).toEqual({id: '1', page: '1', rows: '1', tz: 'owner', method: 'GET', params: {}, url: '/api/things'})
        })
    })

    describe('errors and access', () => {
        it.each(['name', 'unknown_field', 'contract_id', 'thing_id.name', 'nested'])('rejects %s with 422', async path => {
            const err = await expandError(expand([new ItemDto({id: 1, thing_id: 1, contract_id: 1})], path))
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'})
            expect(err.errorList[0].message).toContain(path)
        })

        it('rejects a field without an id (hidden for the role) with 422, soft_expand skips it', async () => {
            const items = [new ItemDto({id: 1, thing_id: 1}), new ItemDto({id: 2})]
            const err = await expandError(expand(items, 'thing_id'))
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'})

            await expand(items, 'thing_id', true)
            expect((items[0]['thing_id_expand'] as ThingDto).id).toEqual(1)
            expect('thing_id_expand' in items[1]).toBe(false)
        })

        it('rejects a role the target does not allow with 403', async () => {
            const err = await expandError(expand([new ItemDto({id: 1, thing_id: 1})], 'thing_id.owner_id', false, 'reseller'))
            expect(err.getStatus()).toEqual(HttpStatus.FORBIDDEN)
            expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_FORBIDDEN'})
            expect(err.errorList[0].message).toContain('thing_id.owner_id')
            expect(owners.calls).toEqual([])
        })

        it('rejects an id outside the caller\'s scope with 403', async () => {
            owners = collection('owners', [new OwnerDto(10), new OwnerDto(11)], {scope: row => row.id != 11})
            interceptor = interceptorFor([things, owners])
            const err = await expandError(expand([new ItemDto({id: 1, thing_id: 2})], 'thing_id.owner_id'))
            expect(err.getStatus()).toEqual(HttpStatus.FORBIDDEN)
            expect(err.errorList[0].code).toEqual('EXPAND_FORBIDDEN')
        })

        it('rejects a target with an inactive license with 403', async () => {
            things = collection('things', [new ThingDto(1)], {licenses: ['header_manipulation']})
            interceptor = interceptorFor([things, owners], false)
            const err = await expandError(expand([new ItemDto({id: 1, thing_id: 1})], 'thing_id'))
            expect(err.getStatus()).toEqual(HttpStatus.FORBIDDEN)
        })

        it('soft_expand adds only what could be read: no field for a forbidden id, arrays without it', async () => {
            owners = collection('owners', [new OwnerDto(10)], {roles: ['admin'], scope: row => row.id != 11})
            things = collection('things', [new ThingDto(1, 10), new ThingDto(2, 11), new ThingDto(3, 10)], {model: ThingDto, scope: row => row.id != 3})
            interceptor = interceptorFor([things, owners])
            const items = [new ItemDto({id: 1, thing_id: 1, thing_ids: [3, 2, 1]}), new ItemDto({id: 2, thing_id: 2, other_thing_id: null})]
            await expand(items, 'thing_id.owner_id,other_thing_id,name,unknown,thing_ids', true)
            expect(((items[0]['thing_id_expand'] as ThingDto)['owner_id_expand'] as OwnerDto).id).toEqual(10)
            expect('owner_id_expand' in (items[1]['thing_id_expand'] as object)).toBe(false)
            expect((items[0]['thing_ids_expand'] as ThingDto[]).map(thing => thing.id)).toEqual([2, 1])
            expect(items[1]['other_thing_id_expand']).toBeNull()
            expect(Object.keys(items[0]).filter(key => key.endsWith('_expand'))).toEqual(['thing_id_expand', 'thing_ids_expand'])

            const forbidden = [new ItemDto({id: 1, thing_id: 1, thing_ids: [1, 2]})]
            await expand(forbidden, 'thing_id.owner_id,thing_ids', true, 'reseller')
            expect('owner_id_expand' in (forbidden[0]['thing_id_expand'] as object)).toBe(false)
            expect((forbidden[0]['thing_ids_expand'] as ThingDto[]).map(thing => thing.id)).toEqual([1, 2])
        })

        it('all expands every allowed top-level field and never fails', async () => {
            things = collection('things', [new ThingDto(1)], {scope: row => row.id == 1})
            const resellers = collection(expandConfig.reseller_id.target, [{id: 5}], {roles: ['system']})
            interceptor = interceptorFor([things, owners, resellers])
            const items = [new ItemDto({id: 1, thing_id: 1, other_thing_id: 2, contract_id: 7, reseller_id: 5})]
            await expand(items, 'all')
            expect((items[0]['thing_id_expand'] as ThingDto).id).toEqual(1)
            expect('other_thing_id_expand' in items[0]).toBe(false)
            expect('contract_id_expand' in items[0]).toBe(false)
            expect('reseller_id_expand' in items[0]).toBe(false)
            expect('nested_expand' in items[0]).toBe(false)
            expect(resellers.calls).toEqual([])
        })

        it('all keeps explicitly requested paths strict', async () => {
            const err = await expandError(expand([new ItemDto({id: 1, thing_id: 1})], 'all,name'))
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
        })
    })

    describe('intercept', () => {
        @NoExpand()
        @Controller('auth/tokens')
        class AuthController {}

        it('expands [items, count] on GET', async () => {
            const result = await run(request({expand: 'thing_id'}), [[new ItemDto({id: 1, thing_id: 1})], 1]) as [ItemDto[], number]
            expect((result[0][0]['thing_id_expand'] as ThingDto).id).toEqual(1)
        })

        it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('rejects expand parameters on %s with 400 before the handler runs', async method => {
            const handler = jest.fn(() => new ItemDto({id: 1, thing_id: 1}))
            const req = request({'expand': 'thing_id', 'soft_expand': '0', 'thing_id.status': 'active'}, 'admin', method)
            const err = await expandError(run(req, handler))
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList.map(entry => [entry.parameter, entry.code])).toEqual([
                ['expand', 'EXPAND_NOT_SUPPORTED'],
                ['soft_expand', 'EXPAND_NOT_SUPPORTED'],
                ['thing_id.status', 'EXPAND_NOT_SUPPORTED'],
            ])
            expect(handler).not.toHaveBeenCalled()
            expect(things.queries).toEqual([])
        })

        it('ignores expand where it is not supported with soft_expand=1, nested filters stay rejected', async () => {
            const item = new ItemDto({id: 1, thing_id: 1})
            await expect(run(request({expand: 'thing_id', soft_expand: '1'}, 'admin', 'POST'), item)).resolves.toBe(item)
            await expect(run(request({expand: 'thing_id', soft_expand: '1'}), item, AuthController)).resolves.toBe(item)
            const csv = await run(request({expand: 'thing_id', soft_expand: '1'}, 'admin', 'GET', 'text/csv'), item, ItemController, ItemHandlers.prototype.readCsv)
            expect(csv).toBe(item)
            expect('thing_id_expand' in item).toBe(false)

            const err = await expandError(run(request({'soft_expand': '1', 'thing_id.status': 'active'}, 'admin', 'POST'), item))
            expect(err.errorList.map(entry => entry.parameter)).toEqual(['thing_id.status'])
        })

        it('passes writes without expand parameters, dotted ones too with allow_unknown_params', async () => {
            const item = new ItemDto({id: 1, thing_id: 1})
            await expect(run(request({}, 'admin', 'POST'), item)).resolves.toBe(item)
            await expect(run(request({'a.b': '1', allow_unknown_params: '1'}, 'admin', 'PATCH'), item)).resolves.toBe(item)
            expect('thing_id_expand' in item).toBe(false)
        })

        it('rejects expand parameters on @NoExpand() controllers with 400, passes requests without', async () => {
            const err = await expandError(run(request({expand: 'thing_id'}), new ItemDto({id: 1, thing_id: 1}), AuthController))
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_NOT_SUPPORTED'})

            const item = new ItemDto({id: 1, thing_id: 1})
            await expect(run(request({}), item, AuthController)).resolves.toBe(item)
        })

        it('rejects expand on a GET without JSON response with 400 before the handler runs', async () => {
            const handler = jest.fn(() => [[], 0])
            for (const [method, accept] of [[ItemHandlers.prototype.readFile, undefined], [ItemHandlers.prototype.readCsv, 'text/csv']] as const) {
                const err = await expandError(run(request({expand: 'thing_id'}, 'admin', 'GET', accept), handler, ItemController, method))
                expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
                expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_NOT_SUPPORTED'})
            }
            expect(handler).not.toHaveBeenCalled()

            const json = await run(request({expand: 'thing_id'}), [[new ItemDto({id: 1, thing_id: 1})], 1], ItemController, ItemHandlers.prototype.readCsv)
            expect((json as [ItemDto[], number])[0][0]['thing_id_expand']).toMatchObject({id: 1})
        })

        it('rejects a malformed expand with 400 before the handler runs, also with soft_expand', async () => {
            const err = await expandError(run(request({expand: 'a..b', soft_expand: '1'}), {}))
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_INVALID_PATH'})
        })

        it.each(['name', 'thing_id.status', 'thing_id.owner_id.email'])(
            'rejects expand=%s by the response classes, also for an empty result',
            async path => {
                const err = await expandError(run(request({expand: path}), [[], 0]))
                expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(err.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'})
            },
        )

        it('accepts expandable paths for an empty result, soft_expand skips the others', async () => {
            await expect(run(request({expand: 'thing_id.owner_id'}), [[], 0])).resolves.toEqual([[], 0])
            await expect(run(request({expand: 'name', soft_expand: 'true'}), [[], 0])).resolves.toEqual([[], 0])
        })
    })

    describe('nested filters', () => {
        const runList = (req: Request, handle: (req: Request) => unknown): Promise<unknown> =>
            run(req, handle, ItemController, ItemHandlers.prototype.readList)

        const rows = [{id: 100, thing_id: 1}, {id: 101, thing_id: 2}, {id: 102, thing_id: 3}]
        // the main collection, applies its nested filters like configureQueryBuilder
        const list = (req: Request): [ListDto[], number] => {
            let found = rows
            for (const filter of nestedFilters(req)) {
                found = found.filter(row => filter.ids.includes(String(row[filter.field])))
                filter.applied = true
            }
            return [found.map(row => Object.assign(new ListDto(), row)), found.length]
        }
        const ids = (result: unknown): number[] => (result as [{id: number}[], number])[0].map(row => row.id)

        it('resolves one level into the ids of the field', async () => {
            const req = request({'thing_id.status': 'active'})
            expect(ids(await runList(req, list))).toEqual([100, 101])
            expect(nestedFilters(req)).toEqual([{field: 'thing_id', parameters: ['thing_id.status'], ids: ['1', '2'], applied: true}])
            expect(things.queries).toEqual([expect.objectContaining({status: 'active', page: '1', rows: '10001', url: '/api/things'})])
        })

        it('resolves two levels innermost first, combined with the level\'s own filters', async () => {
            const req = request({'thing_id.owner_id.email': '10@example.com', 'thing_id.status': 'active'})
            expect(ids(await runList(req, list))).toEqual([100])
            expect(owners.queries).toEqual([expect.objectContaining({email: '10@example.com'})])
            expect(things.queries).toEqual([expect.objectContaining({'owner_id.email': '10@example.com', status: 'active'})])
        })

        it('matches nothing when no target row matches, and out-of-scope rows don\'t match', async () => {
            expect(ids(await runList(request({'thing_id.status': 'none'}), list))).toEqual([])

            owners = collection('owners', [new OwnerDto(10), new OwnerDto(11)], {model: OwnerDto, searchable: ['email'], scope: row => row.id != 11})
            interceptor = interceptorFor([things, owners])
            expect(ids(await runList(request({'thing_id.owner_id.email': '11@example.com'}), list))).toEqual([])
        })

        it('rejects more ids than expand.filter_max_ids with 422', async () => {
            const config = AppService.config.expand
            AppService.config.expand = {filter_max_ids: 1}
            try {
                const err = await expandError(runList(request({'thing_id.status': 'active'}), list))
                expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(err.errorList).toEqual([expect.objectContaining({parameter: 'thing_id.status', code: 'EXPAND_NOT_POSSIBLE'})])
                expect(things.queries[0]).toMatchObject({rows: '2'})
            } finally {
                AppService.config.expand = config
            }
        })

        it('reports an unknown leaf of the target with 422 and the dotted name', async () => {
            const err = await expandError(runList(request({'thing_id.owner_id.foo': '1'}), list))
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList).toEqual([{
                parameter: 'thing_id.owner_id.foo',
                code: 'whitelistValidation',
                message: 'parameter thing_id.owner_id.foo should not exist',
            }])
        })

        it.each([
            ['name.id', 'name.id'],
            ['unknown.id', 'unknown.id'],
            ['thing_id.page', 'thing_id.page'],
        ])('rejects %s with 422', async (key, parameter) => {
            const err = await expandError(runList(request({[key]: '1'}), list))
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList[0]).toMatchObject({parameter, code: 'EXPAND_NOT_POSSIBLE'})
        })

        it('rejects a malformed nested filter key with 400', async () => {
            const err = await expandError(runList(request({'thing_id..status': '1'}), list))
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList[0]).toMatchObject({parameter: 'thing_id..status', code: 'EXPAND_INVALID_PATH'})
        })

        it('leaves unknown dotted parameters to the endpoint with allow_unknown_params', async () => {
            const req = request({'unknown.id': '1', 'name.id': '1', 'thing_id.status': 'active', allow_unknown_params: '1'})
            expect(ids(await runList(req, list))).toEqual([100, 101])
            expect(nestedFilters(req).map(filter => filter.field)).toEqual(['thing_id'])

            const err = await expandError(runList(request({'thing_id.foo': '1', allow_unknown_params: '1'}), list))
            expect(err.errorList[0]).toMatchObject({parameter: 'thing_id.foo', code: 'whitelistValidation'})
        })

        it('rejects a target the role may not read with 403', async () => {
            const err = await expandError(runList(request({'thing_id.owner_id.email': 'x'}, 'reseller'), list))
            expect(err.getStatus()).toEqual(HttpStatus.FORBIDDEN)
            expect(err.errorList[0]).toMatchObject({parameter: 'thing_id.owner_id.email', code: 'EXPAND_FORBIDDEN'})
        })

        it('rejects filters the endpoint or a target did not apply with 422', async () => {
            const err = await expandError(runList(request({'thing_id.status': 'active'}), () => [[], 0]))
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList[0]).toMatchObject({parameter: 'thing_id.status', code: 'EXPAND_NOT_POSSIBLE'})

            things = collection('things', [new ThingDto(1, 10)], {model: ThingDto, ignoresFilters: true})
            interceptor = interceptorFor([things, owners])
            const nested = await expandError(runList(request({'thing_id.owner_id.email': '10@example.com'}), list))
            expect(nested.errorList[0]).toMatchObject({parameter: 'thing_id.owner_id.email', code: 'EXPAND_NOT_POSSIBLE'})
        })

        it('keeps the filters off the sub-requests of expand', async () => {
            const req = request({'thing_id.status': 'active', expand: 'thing_id'})
            const result = await runList(req, list) as [ListDto[], number]
            expect(result[0][0]['thing_id_expand']).toMatchObject({id: 1})
            // the expand read of things saw no nested filters of the main request
            expect(things.calls).toEqual([['1', '2']])
        })
    })

    describe('configureQueryBuilder', () => {
        const queryBuilder = (): {qb: SelectQueryBuilder<BaseEntity>, wheres: [unknown, unknown][]} => {
            const wheres: [unknown, unknown][] = []
            const qb = {
                alias: 'main',
                andWhere: (where: unknown, parameters?: unknown) => {
                    wheres.push([where, parameters])
                    return qb
                },
                limit: () => qb,
                offset: () => qb,
                addOrderBy: () => qb,
                expressionMap: {aliases: []},
            } as unknown as SelectQueryBuilder<BaseEntity>
            return {qb, wheres}
        }
        const configure = (query: Record<string, string>, filters: NestedFilter[], aliases?: Record<string, string | object>): [unknown, unknown][] => {
            const req = request(query)
            setNestedFilters(req, filters)
            const sr = new ServiceRequest({...req, header: (): undefined => undefined} as unknown as Request)
            sr.req = req
            const {qb, wheres} = queryBuilder()
            configureQueryBuilder(qb, sr.query, new SearchLogic(sr, ['id', 'contract_id', 'customer_id'], undefined, aliases))
            return wheres
        }
        const filter = (field: string, ids: string[]): NestedFilter => ({field, parameters: [`${field}.status`], ids, applied: false})

        it('applies the ids on the field\'s alias, AND with a direct filter', () => {
            const contract = filter('contract_id', ['1', '2'])
            const wheres = configure({'contract_id': '2', 'contract_id.status': 'active', 'search_or': '1'}, [contract], {contract_id: 'c.id'})
            expect(wheres).toContainEqual(['c.id IN (:...contract_id_nested_ids)', {contract_id_nested_ids: ['1', '2']}])
            expect(contract.applied).toBe(true)
        })

        it('matches nothing for an empty id list and uses the field of a complex alias', () => {
            const customer = filter('customer_id', [])
            expect(configure({'customer_id.status': 'x'}, [customer], {customer_id: {field: 'contract_id', comparator: '=', format: String}}))
                .toContainEqual(['1 = 0', undefined])
            expect(customer.applied).toBe(true)
        })

        it('leaves a filter on a non-searchable field unapplied, other dotted keys stay unknown', () => {
            const reseller = filter('reseller_id', ['1'])
            configure({'reseller_id.status': 'x'}, [reseller])
            expect(reseller.applied).toBe(false)
            expect(() => configure({'other.status': 'x'}, [])).toThrow(InvalidParameterException)
        })

        it('rejects order_by on a dotted path with 422', () => {
            const req = request({order_by: 'contract_id.status'})
            const sr = {query: req.query, req} as unknown as ServiceRequest
            expect(() => new SearchLogic(sr, ['contract_id'])).toThrow(expect.objectContaining({status: HttpStatus.UNPROCESSABLE_ENTITY}))
        })
    })
})
