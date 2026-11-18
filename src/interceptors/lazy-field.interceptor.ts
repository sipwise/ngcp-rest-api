import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
    NotFoundException,
    OnModuleInit,
    RequestMethod,
    Type,
} from '@nestjs/common'
import {METHOD_METADATA, PATH_METADATA} from '@nestjs/common/constants'
import {ApplicationConfig, DiscoveryService, MetadataScanner, Reflector} from '@nestjs/core'
import {Request} from 'express'
import {Observable} from 'rxjs'
import {mergeMap} from 'rxjs/operators'

import {isObject, parseExpand, respondsWithJson, responseObjects} from './expand.interceptor'

import {EXPAND_SUFFIX, NO_EXPAND_KEY, modelFieldTarget} from '~/decorators/expand.decorator'
import {LazyField, lazyField, lazyFields} from '~/decorators/lazy.decorator'
import {modelClass, responseModel} from '~/decorators/response-model.decorator'
import {isAllowUnknownParams} from '~/helpers/allow-unknown-params.helper'
import {ApiErrorException, errorMessage} from '~/helpers/errors.helper'
import {
    InlineRequest,
    LAZY_METHODS,
    childInlineRequest,
    inlineMaxHardLimit,
    inlineMaxItems,
    placeholderCount,
    setInlineRequest,
} from '~/helpers/lazy-field.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {QueriesDictionary} from '~/interfaces/service-request.interface'

/*
 * Lazy fields: top-level array fields of response classes (and @Lazy()/@LinkOnly() fields) are links to their
 * own collection unless the request inlines them:
 *
 *   GET /api/v2/subscribers/5                     alias_numbers: {type: 'link', url: '/api/v2/subscribers/5/@alias_numbers', total_count: 3}
 *   GET /api/v2/subscribers/5?inline=alias_numbers  alias_numbers: [...]
 *   GET /api/v2/subscribers/5/@alias_numbers      [...] as a collection (filters, order_by, page, rows)
 *
 * 1. Before the handler: `inline` (`a,b`, `all`, `auto`) and `expand` (implies inline of the expanded field)
 *    are checked against the response class and stored on the request (InlineRequest), where services read
 *    them (isInlined, applyLazyFields) to load only what is inlined. Writes load everything.
 *    The services decide on the counts what they load: per object within inline_max_items, per response
 *    (all objects, expanded ones included) within inline_max_hard_limit.
 * 2. After the handler, on the still unserialised response objects: fields that are not inlined become links
 *    with their count; `auto` inlines what was loaded, explicit inline above either limit is 422. The same
 *    applies to expanded objects (`<field>_expand`), with `all`/`auto` and the expand paths below them.
 * 3. `<item>/@<field>` requests (the controller's `:id/@:field` GET route next to its `:id` route): the field
 *    must be lazy (404 otherwise); the service pages it in its source (LazyFieldSource), the items are rendered
 *    as objects of the field's item class, scalars as `{value: x}`.
 */

const INLINE_ALL = 'all'
const INLINE_AUTO = 'auto'
// the GET route of `<item>/@<field>`, next to the item GET route
const FIELD_SEGMENT = '/@:field'
const FIELD_PARAM = 'field'

type ResponseObject = Record<string, unknown>

interface LazyLink {
    type: 'link'
    url: string
    total_count?: number
}

/**
 * A controller's `<item>/@:field` GET route, for swagger
 */
export interface LazyFieldRoute {
    // operation id of the route in the swagger document
    operationId: string
    // response class of the item GET route
    model: Type<unknown>
    sources: LazyFieldSources
}

export interface InlineParameter {
    all: boolean
    auto: boolean
    fields: string[]
}

/**
 * Parses the `inline` query parameter: a comma list of field names, `all` or `auto`
 */
export function parseInline(value: unknown): InlineParameter {
    const inline: InlineParameter = {all: false, auto: false, fields: []}
    if (value === undefined)
        return inline
    const values = [value].flat()
    if (values.some(v => typeof v != 'string'))
        throw invalidInlineError(JSON.stringify(value))
    for (const token of values.join(',').split(',').map(token => token.trim()).filter(token => token)) {
        if (token == INLINE_ALL)
            inline.all = true
        else if (token == INLINE_AUTO)
            inline.auto = true
        else if (!inline.fields.includes(token))
            inline.fields.push(token)
    }
    if (inline.all && inline.auto)
        throw invalidInlineError(values.join(','))
    return inline
}

function invalidInlineError(value: string): ApiErrorException {
    const error = errorMessage('INLINE_INVALID', {value})
    return new ApiErrorException([{parameter: 'inline', code: error.errorCode, message: error.message}], HttpStatus.BAD_REQUEST)
}

function notPossibleError(fields: string[]): ApiErrorException {
    return new ApiErrorException(fields.map(field => {
        const error = errorMessage('INLINE_NOT_POSSIBLE', {field})
        return {parameter: 'inline', code: error.errorCode, message: error.message}
    }))
}

function tooLargeError(field: string, count: number, max: number, scope: 'item' | 'response', url: string): ApiErrorException {
    const error = errorMessage('INLINE_TOO_LARGE', {field, count, max, scope, url})
    return new ApiErrorException([{parameter: 'inline', code: error.errorCode, message: error.message}])
}

function methodPath(handler: object): string {
    const path = [Reflect.getMetadata(PATH_METADATA, handler) as string | string[] ?? ''].flat()[0]
    return path.replace(/^\/+|\/+$/g, '')
}

// the request path without query, the base of the links of an item response
function requestPath(req: Request): string {
    return (req.originalUrl ?? req.url).split('?')[0].replace(/\/+$/, '')
}

@Injectable()
export class LazyFieldInterceptor implements NestInterceptor, OnModuleInit {
    // response class of the item GET route of a controller, for its write representations
    private readonly itemModels = new Map<object, Type<unknown>>()
    // response class of the item GET route by `:id/@:field` handler
    private readonly fieldRouteModels = new Map<object, Type<unknown>>()
    private readonly fieldRoutes: LazyFieldRoute[] = []
    private routesChecked = false

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly reflector: Reflector,
        private readonly appConfig: ApplicationConfig,
    ) {
    }

    /**
     * Startup checks of the GET routes whose response classes have lazy fields: one of them is the item route (its
     * path ends with a parameter), the others its collection (the links are built from the request path).
     * Link-only fields have their dedicated `<item>/@<field>` routes; the other lazy fields need the
     * `<item>/@:field` route, declared after the dedicated `@` routes (it would match them first), and a source
     * each in the controller's service. The hard limit of a response must hold at least the cap of one field.
     */
    onModuleInit(): void {
        if (inlineMaxHardLimit() < inlineMaxItems())
            throw new Error(`lazy: performance.lazy_load.inline_max_hard_limit (${inlineMaxHardLimit()}) is below inline_max_items (${inlineMaxItems()})`)
        this.checkRoutes()
    }

    /**
     * The `<item>/@:field` GET routes of all controllers, for swagger (built before the module init)
     */
    lazyFieldRoutes(): LazyFieldRoute[] {
        this.checkRoutes()
        return this.fieldRoutes
    }

    private checkRoutes(): void {
        if (this.routesChecked)
            return
        this.routesChecked = true
        const scanner = new MetadataScanner()
        for (const wrapper of this.discovery.getControllers()) {
            const controller = wrapper.metatype as Type<unknown> | undefined
            if (!controller || this.reflector.get<boolean>(NO_EXPAND_KEY, controller))
                continue
            const prototype = controller.prototype as Record<string, object>
            const routes = scanner.getAllMethodNames(prototype)
                .map(name => ({name, handler: prototype[name]}))
                .filter(({handler}) => Reflect.getMetadata(METHOD_METADATA, handler) == RequestMethod.GET
                    && Reflect.getMetadata(PATH_METADATA, handler) !== undefined)
                .map(route => ({...route, path: methodPath(route.handler), model: responseModel(route.handler)}))
            const lazyRoutes = routes.filter(route => lazyFields(route.model).length)
            if (!lazyRoutes.length)
                continue
            const prefix = `lazy: ${controller.name}: GET routes with lazy fields (${lazyRoutes.map(route => route.name).join(', ')})`
            const itemRoutes = lazyRoutes.filter(route => /:\w+$/.test(route.path))
            if (itemRoutes.length != 1)
                throw new Error(`${prefix}: exactly one of them must be an item route, its path ending with a parameter`)
            const itemRoute = itemRoutes[0]
            const collectionPath = itemRoute.path.replace(/\/?:\w+$/, '')
            const misplaced = lazyRoutes.filter(route => route !== itemRoute && route.path != collectionPath)
            if (misplaced.length)
                throw new Error(`${prefix}: the links of ${misplaced.map(route => route.name).join(', ')} would not point to their paths`)
            this.itemModels.set(controller, itemRoute.model)

            const fields = lazyFields(itemRoute.model)
            for (const lazy of fields.filter(lazy => lazy.linkOnly)) {
                if (!routes.some(route => route.path == `${itemRoute.path}/@${lazy.field}`))
                    throw new Error(`${prefix}: link-only field ${lazy.field} has no GET route '${itemRoute.path}/@${lazy.field}'`)
            }
            if (fields.every(lazy => lazy.linkOnly))
                continue
            const fieldRoute = routes.find(route => route.path == `${itemRoute.path}${FIELD_SEGMENT}`)
            if (!fieldRoute)
                throw new Error(`${prefix}: no GET route '${itemRoute.path}${FIELD_SEGMENT}'`)
            this.fieldRouteModels.set(fieldRoute.handler, itemRoute.model)
            this.fieldRoutes.push({
                operationId: `${controller.name}_${fieldRoute.name}`,
                model: itemRoute.model,
                sources: this.checkSources(controller, itemRoute.model),
            })
            for (const route of routes.slice(routes.indexOf(fieldRoute) + 1)) {
                if (/\/@[^/]+$/.test(route.path))
                    throw new Error(`lazy: ${controller.name}.${route.name}: '${route.path}' is declared after '${fieldRoute.path}', which matches it first`)
            }
        }
    }

    /**
     * The controller's service, the one injected provider with `lazyFields`, has a source for every lazy field of
     * the item response class except the link-only ones, and none for other fields; returns its sources
     */
    private checkSources(controller: Type<unknown>, model: Type<unknown>): LazyFieldSources {
        const providers = this.discovery.getProviders()
        const injected: unknown[] = Reflect.getMetadata('design:paramtypes', controller) ?? []
        const sources = injected
            .map(type => (providers.find(provider => provider.metatype === type)?.instance as {lazyFields?: LazyFieldSources})?.lazyFields)
            .filter(lazyFields => lazyFields)
        const prefix = `lazy: ${controller.name}: ${model.name} has lazy fields`
        if (sources.length != 1)
            throw new Error(`${prefix}, but ${sources.length} of the services injected into the controller have lazyFields (one expected)`)
        const fields = lazyFields(model).filter(lazy => !lazy.linkOnly).map(lazy => lazy.field)
        const missing = fields.filter(field => !sources[0][field])
        if (missing.length)
            throw new Error(`${prefix}, but no sources for ${missing.join(', ')}`)
        const unknown = Object.keys(sources[0]).filter(field => !fields.includes(field))
        if (unknown.length)
            throw new Error(`${prefix}, but sources for fields it has not: ${unknown.join(', ')}`)
        return sources[0]
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() != 'http')
            return next.handle()
        const req = context.switchToHttp().getRequest<Request>()
        const field = this.fieldRequest(context, req)
        // `<item>/@<field>` items: lazy fields and expand of the item class
        const model = field ? field.itemClass : this.responseModel(context, req)
        const inline: InlineRequest = {...this.inlineRequest(req, model), field}
        setInlineRequest(req, inline)
        if (!model)
            return next.handle()
        return next.handle().pipe(mergeMap(async (data: unknown) => {
            const isCollection = Array.isArray(data)
            const path = requestPath(req)
            await forEachYield(responseObjects(data), object =>
                this.renderObject(object, model, inline, isCollection ? `${path}/${object.id}` : path),
            )
            return data
        }))
    }

    /**
     * The lazy field of a `<item>/@<field>` request; 404 for a field that is not lazy or link-only (served by its
     * own route)
     */
    private fieldRequest(context: ExecutionContext, req: Request): LazyField | undefined {
        const itemModel = this.fieldRouteModels.get(context.getHandler())
        if (!itemModel)
            return undefined
        const lazy = lazyField(itemModel, `${req.params[FIELD_PARAM]}`)
        if (!lazy || lazy.linkOnly)
            throw new NotFoundException()
        return lazy
    }

    /**
     * Response class of the route's lazy fields: the GET's own (JSON responses only), the item GET's for writes
     * (their representations); none for @NoExpand() controllers
     */
    private responseModel(context: ExecutionContext, req: Request): Type<unknown> | undefined {
        if (this.reflector.get<boolean>(NO_EXPAND_KEY, context.getClass()))
            return undefined
        if (!LAZY_METHODS.includes(req.method))
            return this.itemModels.get(context.getClass())
        const model = responseModel(context.getHandler())
        return model && respondsWithJson(this.reflector, context, req) ? model : undefined
    }

    /**
     * Named `inline` fields must be lazy fields of the response class that can be inlined: 422, ignored with
     * allow_unknown_params
     */
    private checkInlineParameter(req: Request, model: Type<unknown> | undefined): InlineParameter {
        const inline = parseInline(req.query?.inline)
        const invalid = inline.fields.filter(field => !lazyField(model, field) || lazyField(model, field).linkOnly)
        if (invalid.length && !isAllowUnknownParams(req.query as QueriesDictionary))
            throw notPossibleError(invalid)
        inline.fields = inline.fields.filter(field => !invalid.includes(field))
        return inline
    }

    /**
     * The fields the request inlines: `inline`, plus the lazy fields named in `expand` (expanding them needs
     * their data); the expand paths are kept for the expanded objects
     */
    private inlineRequest(req: Request, model: Type<unknown> | undefined): InlineRequest {
        const {all, auto, fields} = this.checkInlineParameter(req, model)
        const inline: InlineRequest = {all, auto, fields: new Set(fields), budget: {used: 0}, expand: new Map()}
        if (model && req.method == 'GET') {
            const expand = parseExpand(req.query?.expand)
            if (expand) {
                inline.expand = expand.paths
                for (const field of expand.paths.keys()) {
                    const lazy = lazyField(model, field)
                    if (lazy && !lazy.linkOnly)
                        inline.fields.add(field)
                }
            }
        }
        return inline
    }

    /**
     * Replaces the lazy fields of a response object that are not inlined by links, then does the same on its
     * expanded objects
     * @param url url of the object, the base of its links
     */
    private renderObject(object: ResponseObject, model: Type<unknown>, inline: InlineRequest, url: string): void {
        for (const lazy of lazyFields(model))
            this.renderField(object, lazy, inline, url)
        for (const key of Object.keys(object).filter(key => key.endsWith(EXPAND_SUFFIX))) {
            const field = key.slice(0, -EXPAND_SUFFIX.length)
            const target = modelFieldTarget(model, field)
            if (!target)
                continue
            const subInline = childInlineRequest(inline, [field])
            for (const expanded of [object[key]].flat().filter(isObject)) {
                const expandedModel = modelClass(expanded.constructor)
                if (expandedModel)
                    this.renderObject(expanded, expandedModel, subInline, `${this.prefix()}/${target}/${expanded.id}`)
            }
        }
    }

    private renderField(object: ResponseObject, lazy: LazyField, inline: InlineRequest, url: string): void {
        const value = object[lazy.field]
        if (value === undefined)
            return
        const link: LazyLink = {type: 'link', url: `${url}/@${lazy.field}`}
        if (!lazy.linkOnly) {
            const placeholder = placeholderCount(value)
            const count = placeholder ?? (Array.isArray(value) ? value.length : value === null ? 0 : 1)
            const max = inlineMaxItems()
            if (inline.all || inline.fields.has(lazy.field)) {
                if (count > max)
                    throw tooLargeError(lazy.field, count, max, 'item', link.url)
                if (placeholder === undefined)
                    return
                if (inline.budget.exceeded !== undefined)
                    throw tooLargeError(lazy.field, inline.budget.exceeded, inlineMaxHardLimit(), 'response', link.url)
                throw new Error(`lazy field ${lazy.field} is inlined, but its data was not loaded`)
            }
            if (inline.auto && placeholder === undefined && count <= max)
                return
            link.total_count = count
        }
        object[lazy.field] = link
        delete object[`${lazy.field}${EXPAND_SUFFIX}`]
    }

    private prefix(): string {
        const prefix = this.appConfig.getGlobalPrefix().replace(/^\/|\/$/g, '')
        return prefix ? `/${prefix}` : ''
    }
}
