import {CallHandler, Controller, ExecutionContext, Get, HttpException, HttpStatus, NotFoundException, Type} from '@nestjs/common'
import {ApplicationConfig, DiscoveryService, Reflector} from '@nestjs/core'
import {ApiOkResponse, ApiProperty} from '@nestjs/swagger'
import {Request} from 'express'
import {Observable, defer, lastValueFrom, of} from 'rxjs'

import {ExpandInterceptor} from './expand.interceptor'
import {LazyFieldInterceptor, parseInline} from './lazy-field.interceptor'

import {AppService} from '~/app.service'
import {expandConfig} from '~/config/expand.config'
import {Expand, NoExpand} from '~/decorators/expand.decorator'
import {Lazy, LinkOnly, NotLazy, lazyFields} from '~/decorators/lazy.decorator'
import {ResponseModel} from '~/decorators/response-model.decorator'
import {ApiErrorException} from '~/helpers/errors.helper'
import {NO_INLINE, inlineRequest, isInlined, lazyArray, lazyFieldRequest, memoryFieldSource, setInlineRequest} from '~/helpers/lazy-field.helper'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {LicenseService} from '~/license/license.service'

class EntryDto {
    @ApiProperty()
        name: string
    @ApiProperty()
        rank: number | null
    @ApiProperty()
        active: boolean

    constructor(name: string, rank: number | null, active = true) {
        this.name = name
        this.rank = rank
        this.active = active
    }
}

class OwnerDto {
    @ApiProperty()
        id: number
    @ApiProperty({type: [EntryDto]})
        entries: EntryDto[]

    constructor(id: number, entries: EntryDto[]) {
        this.id = id
        this.entries = entries
    }
}

class PreviewDto {
    @ApiProperty()
        url: string
}

class ThingDto {
    @ApiProperty()
        id: number
    @ApiProperty({type: [EntryDto]})
        entries?: EntryDto[]
    // no swagger type: an array by its design type
    @ApiProperty()
        tags?: string[]
    @Expand('owners')
    @ApiProperty()
        owner_id?: number
    @Expand('owners')
    @ApiProperty({type: [Number]})
        owner_ids?: number[]
    @NotLazy()
    @ApiProperty({type: [String]})
        links?: string[]
    @Lazy()
    @ApiProperty({type: EntryDto, nullable: true})
        best?: EntryDto | null
    @LinkOnly()
    @ApiProperty({type: PreviewDto})
        preview?: PreviewDto

    constructor(values: Partial<ThingDto>) {
        Object.assign(this, values)
    }
}

class PlainDto {
    @ApiProperty()
        id: number
}

// the lazy field sources of a service; the interceptor only checks that they exist
function sources(...fields: string[]): LazyFieldSources {
    return Object.fromEntries(fields.map(field => [field, memoryFieldSource(field, () => undefined)]))
}

class OwnerService {
    lazyFields = sources('entries')
}

class ThingService {
    lazyFields = sources('entries', 'tags', 'owner_ids', 'best')
}

const owners = new Map([
    [10, new OwnerDto(10, [new EntryDto('o1', 1)])],
    [11, new OwnerDto(11, [new EntryDto('o1', 1), new EntryDto('o2', 2), new EntryDto('o3', 3), new EntryDto('o4', 4)])],
])
// isInlined('entries') of the owner reads, as the owners service would ask it
const ownerReads: boolean[] = []

@Controller('owners')
class OwnerController {
    constructor(readonly service: OwnerService) {
    }

    @Get()
    @ResponseModel(OwnerDto)
    async readAll(req: Request): Promise<[OwnerDto[], number]> {
        ownerReads.push(isInlined(req, 'entries'))
        const ids = `${req.query.id}`.split(',').map(Number)
        const found = ids.filter(id => owners.has(id)).map(id => new OwnerDto(id, [...owners.get(id).entries]))
        return [found, found.length]
    }

    @Get(':id')
    @ApiOkResponse({type: OwnerDto})
    read(): void {
        return
    }

    @Get(':id/@:field')
    readField(): void {
        return
    }
}

@Controller('things')
class ThingController {
    constructor(readonly service: ThingService) {
    }

    @Get()
    @ResponseModel(ThingDto)
    readAll(): void {
        return
    }

    @Get(':id/@preview')
    @ApiOkResponse({type: PreviewDto})
    readPreview(): void {
        return
    }

    @Get(':id')
    @ApiOkResponse({type: ThingDto})
    read(): void {
        return
    }

    @Get(':id/@:field')
    readField(): void {
        return
    }

    @Get(':id/journal')
    @ApiOkResponse({type: [PlainDto]})
    readJournal(): void {
        return
    }

    @Get()
    @ResponseModel(ThingDto)
    @ApiOkResponse({type: ThingDto})
    readCsv(): void {
        return
    }
}
Reflect.defineMetadata('validAccepts', ['application/json', 'text/csv'], ThingController.prototype.readCsv)

@NoExpand()
@Controller('auth')
class AuthController {
    @Get()
    @ApiOkResponse({type: ThingDto})
    read(): void {
        return
    }
}

type Wrapper = {instance: unknown, metatype: Type<unknown>}

const wrapper = (controller: Type<unknown>): Wrapper => ({instance: new controller(), metatype: controller})
const appConfig = {getGlobalPrefix: (): string => 'api'} as unknown as ApplicationConfig

function lazyInterceptor(controllers: Type<unknown>[], services: Type<unknown>[] = [ThingService, OwnerService]): LazyFieldInterceptor {
    const discovery = {
        getControllers: () => controllers.map(wrapper),
        getProviders: () => services.map(wrapper),
    } as unknown as DiscoveryService
    const interceptor = new LazyFieldInterceptor(discovery, new Reflector(), appConfig)
    interceptor.onModuleInit()
    return interceptor
}

function expandInterceptor(): ExpandInterceptor {
    // every global mapping target must exist at startup
    const globalTargets = [...new Set(Object.values(expandConfig).map(rule => rule.target))].map(path => {
        @Controller(path)
        class TargetController {
            @Get()
            @ResponseModel(PlainDto)
            readAll(): [PlainDto[], number] {
                return [[], 0]
            }
        }
        return wrapper(TargetController)
    })
    const discovery = {getControllers: () => [wrapper(OwnerController), ...globalTargets]} as unknown as DiscoveryService
    const licenses = {areLicensesActive: async (): Promise<boolean> => true} as unknown as LicenseService
    const interceptor = new ExpandInterceptor(discovery, new Reflector(), licenses, appConfig)
    interceptor.onModuleInit()
    return interceptor
}

interface RequestOptions {
    method?: string
    url?: string
    params?: Record<string, string>
    accept?: string
}

function request(query: Record<string, unknown> = {}, options: RequestOptions = {}): Request {
    const accepts = (types: string[]): string | false => options.accept ? types.includes(options.accept) && options.accept : types[0]
    return {
        query,
        method: options.method ?? 'GET',
        params: options.params ?? {},
        originalUrl: options.url ?? '/api/things',
        headers: options.accept ? {accept: options.accept} : {},
        user: {role: 'admin'},
        accepts,
    } as unknown as Request
}

async function caught(promise: Promise<unknown>): Promise<HttpException> {
    try {
        await promise
    } catch (err) {
        return err as HttpException
    }
    throw new Error('expected an error')
}

function thing(id: number, values: Partial<ThingDto> = {}): ThingDto {
    return new ThingDto({
        id,
        entries: [new EntryDto('a', 1), new EntryDto('b', 2)],
        tags: ['x', 'y', 'z'],
        links: ['/api/foo'],
        best: new EntryDto('best', 1),
        preview: {url: '/api/things/1/@preview'},
        ...values,
    })
}

describe('LazyFieldInterceptor', () => {
    let interceptor: LazyFieldInterceptor
    const savedPerformance = AppService.config.performance

    // runs the request through the lazy interceptor, optionally with the expand interceptor inside it
    const run = async (
        req: Request,
        data: unknown | ((req: Request) => unknown),
        handler: object = ThingController.prototype.readAll,
        controller: object = ThingController,
        expand?: ExpandInterceptor,
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
        const inner: CallHandler = expand
            ? {handle: (): Observable<unknown> => expand.intercept(context, next)}
            : next
        return lastValueFrom(interceptor.intercept(context, inner))
    }
    const read = ThingController.prototype.read
    const readField = ThingController.prototype.readField

    beforeAll(() => {
        AppService.config.performance = {lazy_load: {inline_max_items: 3}}
    })

    afterAll(() => {
        AppService.config.performance = savedPerformance
    })

    beforeEach(() => {
        interceptor = lazyInterceptor([ThingController, OwnerController, AuthController])
        ownerReads.length = 0
    })

    describe('detection', () => {
        it('takes array fields, @Lazy() and @LinkOnly() fields, not @NotLazy() ones', () => {
            expect(lazyFields(ThingDto)).toEqual([
                {field: 'entries', linkOnly: false, isArray: true, itemClass: EntryDto},
                {field: 'tags', linkOnly: false, isArray: true, itemClass: undefined},
                {field: 'owner_ids', linkOnly: false, isArray: true, itemClass: undefined},
                {field: 'best', linkOnly: false, isArray: false, itemClass: EntryDto},
                {field: 'preview', linkOnly: true, isArray: false, itemClass: PreviewDto},
            ])
            expect(lazyFields(EntryDto)).toEqual([])
            expect(lazyFields(undefined)).toEqual([])
        })
    })

    describe('parseInline', () => {
        it('parses a comma list, all and auto', () => {
            expect(parseInline(undefined)).toEqual({all: false, auto: false, fields: []})
            expect(parseInline(' a, b,a ,')).toEqual({all: false, auto: false, fields: ['a', 'b']})
            expect(parseInline(['all', 'a'])).toEqual({all: true, auto: false, fields: ['a']})
            expect(parseInline('auto')).toEqual({all: false, auto: true, fields: []})
        })

        it.each([
            [{a: '1'}],
            ['all,auto'],
        ])('rejects %j with 400', async value => {
            const err = await caught((async (): Promise<unknown> => parseInline(value))()) as ApiErrorException
            expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
            expect(err.errorList[0]).toMatchObject({parameter: 'inline', code: 'INLINE_INVALID'})
        })
    })

    describe('links', () => {
        it('replaces lazy fields by links with their count, keeps the rest', async () => {
            const req = request({}, {url: '/api/things/1?tz=UTC', params: {id: '1'}})
            const result = await run(req, thing(1), read) as ThingDto
            expect(result.entries).toEqual({type: 'link', url: '/api/things/1/@entries', total_count: 2})
            expect(result.tags).toEqual({type: 'link', url: '/api/things/1/@tags', total_count: 3})
            expect(result.best).toEqual({type: 'link', url: '/api/things/1/@best', total_count: 1})
            expect(result.preview).toEqual({type: 'link', url: '/api/things/1/@preview'})
            expect(result.links).toEqual(['/api/foo'])
            expect(result.id).toEqual(1)
        })

        it('builds the links of collection rows from the request path and the id', async () => {
            const [rows] = await run(request(), [[thing(1), thing(2)], 2]) as [ThingDto[], number]
            expect(rows.map(row => row.entries)).toEqual([
                {type: 'link', url: '/api/things/1/@entries', total_count: 2},
                {type: 'link', url: '/api/things/2/@entries', total_count: 2},
            ])
        })

        it('counts null objects as 0 and leaves hidden fields out', async () => {
            const result = await run(request(), [thing(1, {best: null, tags: undefined})]) as ThingDto[]
            expect(result[0].best).toEqual({type: 'link', url: '/api/things/1/@best', total_count: 0})
            expect(result[0].tags).toBeUndefined()
        })

        it('takes the count of a field that was not loaded from lazyArray()', async () => {
            const result = await run(request(), [thing(1, {entries: lazyArray(undefined, 5000)})]) as ThingDto[]
            expect(result[0].entries).toEqual({type: 'link', url: '/api/things/1/@entries', total_count: 5000})
            expect(lazyArray(undefined)).toBeUndefined()
            const data = [new EntryDto('a', 1)]
            expect(lazyArray(data, 7)).toBe(data)
        })

        it('leaves @NoExpand() controllers and non-JSON responses alone', async () => {
            const auth = await run(request(), thing(1), AuthController.prototype.read, AuthController) as ThingDto
            expect(auth.entries).toHaveLength(2)
            const csv = await run(request({}, {accept: 'text/csv'}), thing(1), ThingController.prototype.readCsv) as ThingDto
            expect(csv.entries).toHaveLength(2)
        })

        it('renders write representations with the response class of the item GET', async () => {
            const req = request({inline: 'tags'}, {method: 'PUT', url: '/api/things/1'})
            const result = await run(req, thing(1), {}) as ThingDto
            expect(result.entries).toEqual({type: 'link', url: '/api/things/1/@entries', total_count: 2})
            expect(result.tags).toEqual(['x', 'y', 'z'])
            expect(isInlined(req, 'entries')).toBe(true)
        })
    })

    describe('inline', () => {
        it('inlines the named fields', async () => {
            const req = request({inline: 'entries,best'})
            const [result] = await run(req, [thing(1)]) as ThingDto[]
            expect(result.entries).toHaveLength(2)
            expect(result.best).toEqual(new EntryDto('best', 1))
            expect(result.tags).toMatchObject({type: 'link'})
            expect(isInlined(req, 'entries')).toBe(true)
            expect(isInlined(req, 'tags')).toBe(false)
        })

        it('inlines all lazy fields but link-only ones with all', async () => {
            const [result] = await run(request({inline: 'all'}), [thing(1)]) as ThingDto[]
            expect(result.entries).toHaveLength(2)
            expect(result.tags).toHaveLength(3)
            expect(result.preview).toEqual({type: 'link', url: '/api/things/1/@preview'})
        })

        it('inlines per row by count with auto', async () => {
            const big = [1, 2, 3, 4].map(i => new EntryDto(`${i}`, i))
            const req = request({inline: 'auto'})
            const result = await run(req, [thing(1), thing(2, {entries: big}), thing(3, {entries: lazyArray(undefined, 9)})]) as ThingDto[]
            expect(result.map(row => Array.isArray(row.entries) ? row.entries.length : row.entries)).toEqual([
                2,
                {type: 'link', url: '/api/things/2/@entries', total_count: 4},
                {type: 'link', url: '/api/things/3/@entries', total_count: 9},
            ])
            expect(isInlined(req, 'entries')).toBe(true)
        })

        it('links with auto what the service did not load (inline_max_hard_limit)', async () => {
            const [result] = await run(request({inline: 'auto'}), [thing(1, {entries: lazyArray(undefined, 2)})]) as ThingDto[]
            expect(result.entries).toEqual({type: 'link', url: '/api/things/1/@entries', total_count: 2})
        })

        it('rejects an explicit inline above inline_max_items with 422, before loading where counted', async () => {
            const big = [1, 2, 3, 4].map(i => new EntryDto(`${i}`, i))
            const req = request({inline: 'entries'})
            const err = await caught(run(req, [thing(1), thing(2, {entries: big})])) as ApiErrorException
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList).toEqual([{
                parameter: 'inline',
                code: 'INLINE_TOO_LARGE',
                message: 'Field entries cannot be inlined, 4 items are more than the 3 allowed per item, read them from /api/things/2/@entries or use inline=auto',
            }])
            const all = await caught(run(request({inline: 'all'}), [thing(1, {entries: lazyArray(undefined, 4)})])) as ApiErrorException
            expect(all.errorList[0].code).toEqual('INLINE_TOO_LARGE')
        })

        it('rejects an explicit inline above inline_max_hard_limit with 422', async () => {
            AppService.config.performance = {lazy_load: {inline_max_items: 3, inline_max_hard_limit: 4}}
            // the service loaded nothing: entries of both rows would exceed the hard limit
            const data = (req: Request): ThingDto[] => {
                inlineRequest(req).budget.exceeded = 5
                return [thing(1, {entries: lazyArray(undefined, 2)}), thing(2, {entries: lazyArray(undefined, 3)})]
            }
            const err = await caught(run(request({inline: 'entries'}), data)) as ApiErrorException
            AppService.config.performance = {lazy_load: {inline_max_items: 3}}
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList).toEqual([{
                parameter: 'inline',
                code: 'INLINE_TOO_LARGE',
                message: 'Field entries cannot be inlined, 5 items are more than the 4 allowed per response, read them from /api/things/1/@entries or use inline=auto',
            }])
        })

        it('fails on an inlined field whose data was not loaded', async () => {
            const err = await caught(run(request({inline: 'entries'}), [thing(1, {entries: lazyArray(undefined, 2)})]))
            expect(err).not.toBeInstanceOf(HttpException)
        })

        it.each([
            ['nope'],
            ['id'],
            ['links'],
            ['preview'],
        ])('rejects inline=%s with 422 INLINE_NOT_POSSIBLE', async field => {
            const err = await caught(run(request({inline: field}), [thing(1)])) as ApiErrorException
            expect(err.getStatus()).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            expect(err.errorList).toEqual([{parameter: 'inline', code: 'INLINE_NOT_POSSIBLE', message: `Field ${field} cannot be inlined`}])
        })

        it('ignores fields that cannot be inlined with allow_unknown_params', async () => {
            const [result] = await run(request({inline: 'nope,tags', allow_unknown_params: 'true'}), [thing(1)]) as ThingDto[]
            expect(result.tags).toHaveLength(3)
        })

        it('loads everything for requests without lazy field handling', () => {
            expect(isInlined(undefined, 'entries')).toBe(true)
            expect(isInlined(request(), 'entries')).toBe(true)
            const req = request({}, {method: 'POST'})
            setInlineRequest(req, NO_INLINE)
            expect(isInlined(req, 'entries')).toBe(true)
        })
    })

    describe('expand', () => {
        let expand: ExpandInterceptor

        beforeEach(() => {
            expand = expandInterceptor()
        })

        it('inlines a lazy field named in expand', async () => {
            const req = request({expand: 'owner_ids'})
            const [result] = await run(req, [thing(1, {owner_ids: [10]})], undefined, undefined, expand) as Record<string, unknown>[]
            expect(result.owner_ids).toEqual([10])
            expect(result.owner_ids_expand).toEqual([expect.objectContaining({id: 10})])
        })

        it('skips lazy fields that are not inlined with expand=all, drops expanded data of linked fields', async () => {
            const [skipped] = await run(request({expand: 'all'}), [thing(1, {owner_id: 10, owner_ids: [10]})], undefined, undefined, expand) as Record<string, unknown>[]
            expect(skipped.owner_ids).toMatchObject({type: 'link', total_count: 1})
            expect(skipped).not.toHaveProperty('owner_ids_expand')
            expect(skipped.owner_id_expand).toBeDefined()

            const [inlined] = await run(request({expand: 'all', inline: 'owner_ids'}), [thing(1, {owner_ids: [10]})], undefined, undefined, expand) as Record<string, unknown>[]
            expect(inlined.owner_ids_expand).toHaveLength(1)
        })

        it('renders the lazy fields of expanded objects with their own urls, all/auto carry over', async () => {
            const data = (): ThingDto[] => [thing(1, {owner_id: 10}), thing(2, {owner_id: 11})]
            const [linked] = await run(request({expand: 'owner_id'}), data(), undefined, undefined, expand) as Record<string, Record<string, unknown>>[]
            expect(linked.owner_id_expand.entries).toEqual({type: 'link', url: '/api/owners/10/@entries', total_count: 1})
            expect(ownerReads).toEqual([false])

            const auto = await run(request({expand: 'owner_id', inline: 'auto'}), data(), undefined, undefined, expand) as Record<string, Record<string, unknown>>[]
            expect(auto[0].owner_id_expand.entries).toHaveLength(1)
            expect(auto[1].owner_id_expand.entries).toMatchObject({type: 'link', total_count: 4})
            expect(ownerReads).toEqual([false, true])
        })

        it('inlines the lazy fields of expanded objects named in the expand path', async () => {
            const req = request({expand: 'owner_id.entries', soft_expand: 'true'})
            const [result] = await run(req, [thing(1, {owner_id: 10})], undefined, undefined, expand) as Record<string, Record<string, unknown>>[]
            expect(result.owner_id_expand.entries).toHaveLength(1)
            expect(inlineRequest(req).fields).toEqual(new Set())
        })

        it('expands the fields of the item class on @<field> requests, none on scalar items', async () => {
            const fieldRequest = (name: string): Request => request({expand: 'name'}, {url: `/api/things/1/@${name}`, params: {id: '1', field: name}})
            const objects = await caught(run(fieldRequest('entries'), [[], 0], readField, undefined, expand)) as ApiErrorException
            expect(objects.errorList[0]).toMatchObject({parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'})
            const scalars = await caught(run(fieldRequest('tags'), [[], 0], readField, undefined, expand)) as ApiErrorException
            expect(scalars.errorList[0].code).toEqual('EXPAND_NOT_SUPPORTED')
        })
    })

    describe('@<field>', () => {
        const field = (name: string, query: Record<string, unknown> = {}): Request =>
            request(query, {url: `/api/things/1/@${name}`, params: {id: '1', field: name}})

        it('passes the page of the handler through and marks the request as @<field> request', async () => {
            const req = field('entries')
            const page = [[new EntryDto('a', 1)], 1]
            expect(await run(req, page, readField)).toEqual(page)
            expect(lazyFieldRequest(req)).toMatchObject({field: 'entries', itemClass: EntryDto})
        })

        it('checks inline against the item class', async () => {
            const err = await caught(run(field('entries', {inline: 'tags'}), [[], 0], readField)) as ApiErrorException
            expect(err.errorList[0]).toMatchObject({parameter: 'inline', code: 'INLINE_NOT_POSSIBLE'})
        })

        it.each([
            ['nope'],
            ['id'],
            ['links'],
            ['preview'],
        ])('is 404 for @%s, before the handler', async name => {
            expect(await caught(run(field(name), () => {
                throw new Error('handler called')
            }, readField))).toBeInstanceOf(NotFoundException)
        })
    })

    describe('startup checks', () => {
        it('requires inline_max_hard_limit to be at least inline_max_items', () => {
            AppService.config.performance = {lazy_load: {inline_max_items: 3, inline_max_hard_limit: 2}}
            expect(() => lazyInterceptor([ThingController])).toThrow(/inline_max_hard_limit \(2\) is below inline_max_items \(3\)/)
            AppService.config.performance = {lazy_load: {inline_max_items: 3}}
        })

        it('requires one item route among the GET routes with lazy fields', () => {
            @Controller('broken')
            class BrokenController {
                constructor(readonly service: ThingService) {
                }

                @Get()
                @ResponseModel(ThingDto)
                readAll(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([BrokenController])).toThrow(/BrokenController: GET routes with lazy fields \(readAll\): exactly one of them must be an item route/)
        })

        it('requires the other GET routes with lazy fields to be the collection of the item route', () => {
            @Controller('broken')
            class BrokenController {
                constructor(readonly service: ThingService) {
                }

                @Get(':id')
                @ApiOkResponse({type: ThingDto})
                read(): void {
                    return
                }

                @Get('other')
                @ResponseModel(ThingDto)
                readOther(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([BrokenController])).toThrow(/the links of readOther would not point to their paths/)
        })

        it('requires the @:field route and dedicated routes of link-only fields declared before it', () => {
            @Controller('missing')
            class MissingController {
                constructor(readonly service: ThingService) {
                }

                @Get(':id/@preview')
                @ApiOkResponse({type: PreviewDto})
                readPreview(): void {
                    return
                }

                @Get(':id')
                @ApiOkResponse({type: ThingDto})
                read(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([MissingController])).toThrow(/no GET route ':id\/@:field'/)

            @Controller('missing')
            class MissingPreviewController {
                constructor(readonly service: ThingService) {
                }

                @Get(':id')
                @ApiOkResponse({type: ThingDto})
                read(): void {
                    return
                }

                @Get(':id/@:field')
                readField(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([MissingPreviewController])).toThrow(/link-only field preview has no GET route ':id\/@preview'/)

            @Controller('late')
            class LateController {
                constructor(readonly service: ThingService) {
                }

                @Get(':id')
                @ApiOkResponse({type: ThingDto})
                read(): void {
                    return
                }

                @Get(':id/@:field')
                readField(): void {
                    return
                }

                @Get(':id/@preview')
                @ApiOkResponse({type: PreviewDto})
                readPreview(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([LateController])).toThrow(/readPreview: ':id\/@preview' is declared after ':id\/@:field'/)
        })

        it('needs no @:field route when all lazy fields are link-only', () => {
            class LinksDto {
                @ApiProperty()
                    id: number
                @LinkOnly()
                @ApiProperty({type: PreviewDto})
                    preview: PreviewDto
            }

            @Controller('links')
            class LinksController {
                @Get(':id')
                @ApiOkResponse({type: LinksDto})
                read(): void {
                    return
                }

                @Get(':id/@preview')
                @ApiOkResponse({type: PreviewDto})
                readPreview(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([LinksController])).not.toThrow()
        })

        it('requires exactly one source per lazy field in the one injected service with lazyFields', () => {
            class PartialService {
                lazyFields = sources('entries', 'tags', 'nope')
            }

            @Controller('things')
            class SourcesController {
                constructor(readonly service: PartialService, readonly things: ThingService) {
                }

                @Get(':id')
                @ApiOkResponse({type: ThingDto})
                read(): void {
                    return
                }

                @Get(':id/@preview')
                @ApiOkResponse({type: PreviewDto})
                readPreview(): void {
                    return
                }

                @Get(':id/@:field')
                readField(): void {
                    return
                }
            }
            expect(() => lazyInterceptor([SourcesController], [ThingService, PartialService]))
                .toThrow(/2 of the services injected into the controller have lazyFields \(one expected\)/)
            expect(() => lazyInterceptor([SourcesController], [PartialService]))
                .toThrow(/no sources for owner_ids, best/)

            class ExtraService {
                lazyFields = sources('entries', 'tags', 'owner_ids', 'best', 'nope')
            }
            Reflect.defineMetadata('design:paramtypes', [ExtraService], SourcesController)
            expect(() => lazyInterceptor([SourcesController], [ExtraService]))
                .toThrow(/sources for fields it has not: nope/)
        })
    })
})
