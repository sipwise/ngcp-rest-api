import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
    OnModuleInit,
    RequestMethod,
    StreamableFile,
    Type,
} from '@nestjs/common'
import {METHOD_METADATA, PATH_METADATA} from '@nestjs/common/constants'
import {ApplicationConfig, DiscoveryService, MetadataScanner, Reflector} from '@nestjs/core'
import {DECORATORS} from '@nestjs/swagger'
import {Request} from 'express'
import {Observable, defer} from 'rxjs'
import {switchMap} from 'rxjs/operators'

import {AppService} from '~/app.service'
import {reservedQueryParamKeys} from '~/config/constants.config'
import {expandConfig} from '~/config/expand.config'
import {
    EXPAND_SUFFIX,
    NO_EXPAND_KEY,
    expandDeclarations,
    modelFieldClass,
    modelFieldTarget,
    modelFields,
} from '~/decorators/expand.decorator'
import {responseModel} from '~/decorators/response-model.decorator'
import {isAllowUnknownParams} from '~/helpers/allow-unknown-params.helper'
import {
    ApiErrorException,
    ErrorEntry,
    ValidationFailedException,
    errorMessage,
    isErrorListException,
} from '~/helpers/errors.helper'
import {NestedFilter, nestedFilters, setNestedFilters} from '~/helpers/nested-filter.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {QueriesDictionary} from '~/interfaces/service-request.interface'
import {LicenseService} from '~/license/license.service'

/*
 * Expand and nested filters, for every GET except those of @NoExpand() controllers:
 *
 *   GET /api/v2/subscribers?customer_id.status=active&expand=customer_id.contact_id
 *
 * 1. Nested filters: the customers with status=active are read from /customers as the caller, their
 *    ids go to the main query as `customer_id IN (ids)` (NestedFilter, applied by configureQueryBuilder).
 *    Deeper filters (`customer_id.contact_id.email`) are resolved innermost first.
 * 2. The expand paths are checked against the handler's response class (ExpandField), before the handler runs.
 * 3. The handler runs.
 * 4. Expand: every subscriber gets `customer_id_expand` from one read of /customers, then every customer read
 *    gets `contact_id_expand` from one read of /customercontacts.
 *
 * Targets are read through their own readAll as the caller (subRequest), so their @Auth roles, @License and
 * service scope apply. A target the caller may not read, or an id the read doesn't return: 403. A path that
 * cannot be expanded: 422. Expand parameters where expand doesn't exist (methods other than GET, @NoExpand()
 * controllers, responses that are not JSON): 400 EXPAND_NOT_SUPPORTED, before the handler runs.
 *
 * soft_expand=1 (and the fields added by `all`) ignores all of these: 200, only what could be expanded is
 * added. Syntax errors (`expand=a..b`) are 400 EXPAND_INVALID_PATH in any case.
 */

const EXPAND_ALL = 'all'
const ALLOWED_EXPAND_METHODS = [
    'GET',
]
const CHUNK_SIZE = 500
const FILTER_MAX_IDS = 10000

type ResponseObject = Record<string, unknown>
type Query = Record<string, unknown>

/**
 * Requested paths of `expand=a,b.c` as a tree: a -> {}, b -> {c -> {}}
 */
export type PathTree = Map<string, PathTree>

export interface ExpandRequest {
    paths: PathTree
    all: boolean
}

/**
 * A collection expand and nested filters read from: the readAll route of a controller
 */
interface ExpandTarget {
    // resource path, e.g. `rewrite-rules/sets`
    path: string
    readAll: (req: Request) => Promise<unknown>
    roles: string[]
    licenses: string[]
    model?: Type<unknown>
}

/**
 * A requested field of a response class, checked before the handler runs
 */
interface ExpandField {
    field: string
    // position in the request, for errors: `customer_id.contact_id`
    path: string
    // id field: the collection its ids point to
    target?: ExpandTarget
    // object field (or array of objects): only a step of the path, its own fields are expanded
    nestedModel?: Type<unknown>
    // soft_expand or added by `all`: skipped or null instead of 422/403
    optional: boolean
    children: ExpandField[]
}

/**
 * Parses the `expand` query parameter: a comma list of dotted paths (`a,b.c`), `all` for every allowed
 * top-level field; undefined when nothing is requested
 */
export function parseExpand(value: unknown): ExpandRequest | undefined {
    if (value === undefined)
        return undefined
    const values = [value].flat()
    if (values.some(v => typeof v != 'string'))
        throw invalidPathError(JSON.stringify(value), 'expand')
    const request: ExpandRequest = {paths: new Map(), all: false}
    const tokens = values.join(',').split(',').map(token => token.trim()).filter(token => token)
    for (const token of tokens) {
        if (token == EXPAND_ALL) {
            request.all = true
            continue
        }
        let paths = request.paths
        for (const segment of token.split('.')) {
            if (!segment)
                throw invalidPathError(token, 'expand')
            if (!paths.has(segment))
                paths.set(segment, new Map())
            paths = paths.get(segment)
        }
    }
    return request.all || request.paths.size ? request : undefined
}

/**
 * Resource paths of a route: controller path + method path, without optional groups (`{:setId/}`);
 * paths that still need a parameter are left out
 */
export function resourcePaths(controller: object, handler: object): string[] {
    const controllerPaths = [Reflect.getMetadata(PATH_METADATA, controller) as string | string[] ?? ''].flat()
    const handlerPaths = [Reflect.getMetadata(PATH_METADATA, handler) as string | string[] ?? ''].flat()
    return controllerPaths
        .flatMap(controllerPath => handlerPaths.map(handlerPath => `${controllerPath}/${handlerPath}`
            .replace(/\{[^}]*\}/g, '')
            .split('/')
            .filter(segment => segment)
            .join('/'),
        ))
        .filter(path => !/[:*]/.test(path))
}

function expandError(
    key: 'EXPAND_NOT_POSSIBLE' | 'EXPAND_FORBIDDEN',
    path: string,
    parameters: string[] = ['expand'],
): ApiErrorException {
    const error = errorMessage(key, {field: path})
    const status = key == 'EXPAND_FORBIDDEN' ? HttpStatus.FORBIDDEN : HttpStatus.UNPROCESSABLE_ENTITY
    return new ApiErrorException(
        parameters.map(parameter => ({parameter, code: error.errorCode, message: error.message})),
        status,
    )
}

// a syntax error (`a..b`, `a.`): 400, also with soft_expand
function invalidPathError(path: string, parameter: string): ApiErrorException {
    const error = errorMessage('EXPAND_INVALID_PATH', {path})
    return new ApiErrorException([{parameter, code: error.errorCode, message: error.message}], HttpStatus.BAD_REQUEST)
}

function isObject(value: unknown): value is ResponseObject {
    return typeof value == 'object' && value != null && !Array.isArray(value)
        && !(value instanceof Date) && !Buffer.isBuffer(value) && !(value instanceof StreamableFile)
}

function isId(value: unknown): value is number | string {
    return Number.isInteger(value) || (typeof value == 'string' && /^\d+$/.test(value))
}

/**
 * Response objects of a handler result: `[objects, count]`, a list or a single object
 */
function responseObjects(data: unknown): ResponseObject[] {
    if (Array.isArray(data)) {
        const list: unknown[] = data.length == 2 && Array.isArray(data[0]) && typeof data[1] == 'number'
            ? data[0]
            : data
        return list.filter(isObject)
    }
    return isObject(data) ? [data] : []
}

/**
 * The objects of an object field (or array of objects) of every object; 422 for another value, null is skipped
 */
function nestedObjects(objects: ResponseObject[], field: ExpandField): ResponseObject[] {
    const nested: ResponseObject[] = []
    for (const object of objects) {
        const value = object[field.field]
        if (isObject(value))
            nested.push(value)
        else if (Array.isArray(value) && value.every(isObject))
            nested.push(...value)
        else if (value !== null && !field.optional)
            throw expandError('EXPAND_NOT_POSSIBLE', field.path)
    }
    return nested
}

/**
 * Read of a target collection as the caller: a GET of the collection that inherits user and headers from
 * `req` (Object.create) and has its own url, query and params. The nested filters of the read are its own,
 * not those of `req`.
 */
function subRequest(req: Request, url: string, query: Query, filters: NestedFilter[] = []): Request {
    const subQuery = {...query}
    if (typeof req.query?.tz == 'string')
        subQuery.tz = req.query.tz
    const sub: Request = Object.create(req, {
        url: {value: url, enumerable: true},
        originalUrl: {value: url, enumerable: true},
        query: {value: subQuery, enumerable: true},
        params: {value: {}, enumerable: true},
        method: {value: 'GET', enumerable: true},
        body: {value: undefined, enumerable: true},
    })
    setNestedFilters(sub, filters)
    return sub
}

function isNestedFilterKey(key: string): boolean {
    return key.includes('.')
}

function isJsonType(type: string): boolean {
    return type == 'application/json' || type.endsWith('+json')
}

function notSupportedError(parameters: string[]): ApiErrorException {
    return new ApiErrorException(parameters.map(parameter => {
        const error = errorMessage('EXPAND_NOT_SUPPORTED', {parameter})
        return {parameter, code: error.errorCode, message: error.message}
    }), HttpStatus.BAD_REQUEST)
}

/**
 * Requests without expand (methods other than GET, @NoExpand() controllers) must not carry its parameters:
 * `expand` and `soft_expand` (ignored with soft_expand=1), nested filters (left to the endpoint with
 * allow_unknown_params)
 */
function assertNoExpandParameters(req: Request): void {
    const softExpand = SearchLogic.isTrue(req.query.soft_expand)
    const ignoreUnknown = isAllowUnknownParams(req.query as QueriesDictionary)
    const parameters = Object.keys(req.query ?? {}).filter(key => isNestedFilterKey(key)
        ? !ignoreUnknown
        : ['expand', 'soft_expand'].includes(key) && !softExpand)
    if (parameters.length)
        throw notSupportedError(parameters)
}

/**
 * A nested filter the endpoint did not apply would return unfiltered data: 422 instead
 * @param prefix path of the level in the request (`contract_id.`)
 */
function assertFiltersApplied(filters: NestedFilter[], prefix: string): void {
    const entries = filters.filter(filter => !filter.applied).flatMap(filter => {
        const error = errorMessage('EXPAND_NOT_POSSIBLE', {field: prefix + filter.field})
        return filter.parameters.map(parameter => ({parameter: prefix + parameter, code: error.errorCode, message: error.message}))
    })
    if (entries.length)
        throw new ApiErrorException(entries)
}

/**
 * Error of a target read for a nested filter, with its parameters named as in the request (`email` ->
 * `contract_id.contact_id.email`); invalid filter values of the target are 422
 */
function nestedFilterError(err: unknown, prefix: string): unknown {
    if (!isErrorListException(err) || !err.errorList.some(entry => entry.parameter))
        return err
    const entries: ErrorEntry[] = err.errorList.map(entry => entry.parameter
        ? {
            ...entry,
            parameter: prefix + entry.parameter,
            message: entry.message.replace(entry.parameter, prefix + entry.parameter),
        }
        : entry)
    const status = err.getStatus()
    if (status == HttpStatus.BAD_REQUEST || status == HttpStatus.UNPROCESSABLE_ENTITY)
        return new ValidationFailedException(entries)
    return new ApiErrorException(entries, status)
}

function filterMaxIds(): number {
    return AppService.config.expand?.filter_max_ids ?? FILTER_MAX_IDS
}

@Injectable()
export class ExpandInterceptor implements NestInterceptor, OnModuleInit {
    // target collections by resource path
    private readonly targets = new Map<string, ExpandTarget>()

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly reflector: Reflector,
        private readonly licenseService: LicenseService,
        private readonly appConfig: ApplicationConfig,
    ) {
    }

    /**
     * Every target of the global mapping and of @Expand() must be a collection with a response class
     */
    onModuleInit(): void {
        this.discoverTargets()
        const declarations = [
            ...Object.entries(expandConfig).map(([field, rule]) => ({owner: 'expand.config', field, target: rule.target})),
            ...expandDeclarations.map(({type, field, target}) => ({owner: (type as {name: string}).name, field, target})),
        ]
        for (const {owner, field, target} of declarations) {
            if (!this.targets.has(target))
                throw new Error(`expand: ${owner} ${field}: target '${target}' is not a collection with readAll`)
            if (!this.targets.get(target).model)
                throw new Error(`expand: ${owner} ${field}: target '${target}' has no response model`)
        }
    }

    /**
     * Response DTO classes of the target collections by resource path, for swagger; available before the app
     * is initialised
     */
    targetModels(): Map<string, Type<unknown> | undefined> {
        this.discoverTargets()
        return new Map([...this.targets].map(([path, target]) => [path, target.model]))
    }

    /**
     * Response DTO classes of the GET routes expand applies to, for swagger
     */
    responseModels(): Type<unknown>[] {
        const scanner = new MetadataScanner()
        const models = new Set<Type<unknown>>()
        for (const wrapper of this.discovery.getControllers()) {
            const controller = wrapper.metatype as Type<unknown> | undefined
            if (!controller || this.reflector.get<boolean>(NO_EXPAND_KEY, controller))
                continue
            const prototype = controller.prototype as Record<string, object>
            for (const method of scanner.getAllMethodNames(prototype)) {
                const handler = prototype[method]
                const model = Reflect.getMetadata(METHOD_METADATA, handler) == RequestMethod.GET
                    ? responseModel(handler)
                    : undefined
                if (model)
                    models.add(model)
            }
        }
        return [...models]
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() != 'http')
            return next.handle()
        const req = context.switchToHttp().getRequest<Request>()
        if (this.reflector.get<boolean>(NO_EXPAND_KEY, context.getClass()) || !ALLOWED_EXPAND_METHODS.includes(req.method)) {
            assertNoExpandParameters(req)
            return next.handle()
        }
        const model = responseModel(context.getHandler())
        const filterQuery = this.nestedFilterQuery(req, model)
        const softExpand = SearchLogic.isTrue(req.query.soft_expand)
        let expandRequest = parseExpand(req.query.expand)
        if (expandRequest && (!model || !this.respondsWithJson(context, req))) {
            if (!softExpand)
                throw notSupportedError(['expand'])
            expandRequest = undefined
        }
        if (!expandRequest && !Object.keys(filterQuery).length)
            return next.handle()
        let fields: ExpandField[] = []
        return defer(async () => {
            if (Object.keys(filterQuery).length)
                setNestedFilters(req, await this.resolveNestedFilters(model, filterQuery, '', req))
            if (expandRequest)
                fields = await this.resolveExpandFields(model, expandRequest, softExpand, req)
        }).pipe(
            switchMap(() => next.handle()),
            switchMap(async (data: unknown) => {
                assertFiltersApplied(nestedFilters(req), '')
                await this.expandFields(responseObjects(data), fields, req)
                return data
            }),
        )
    }

    /**
     * Whether the response is JSON. Routes that also produce other types (`text/csv`, `application/pdf`;
     * @ApiAcceptHeader, @ApiProduces) negotiate them from the Accept header, as their handlers do.
     */
    private respondsWithJson(context: ExecutionContext, req: Request): boolean {
        const routes = [context.getHandler(), context.getClass()]
        const types = [
            ...this.reflector.getAllAndOverride<string[]>('validAccepts', routes) ?? [],
            ...this.reflector.getAllAndOverride<string[]>(DECORATORS.API_PRODUCES, routes) ?? [],
        ].filter(type => type != '*/*')
        if (types.every(isJsonType))
            return true
        const negotiated = req.accepts(types)
        return typeof negotiated == 'string' && isJsonType(negotiated)
    }

    // expand

    /**
     * The fields to expand: the requested paths, checked against the response class, plus the fields of `all`
     */
    private async resolveExpandFields(
        model: Type<unknown>,
        request: ExpandRequest,
        softExpand: boolean,
        req: Request,
    ): Promise<ExpandField[]> {
        const fields = this.requestedFields(model, request.paths, '', softExpand)
        if (request.all)
            fields.push(...await this.allFields(model, request.paths, req))
        return fields
    }

    /**
     * The requested paths as fields of the response class; 422 for a path that cannot be expanded (unknown
     * field, neither an id nor an object field, an object field as the last step), unless optional
     */
    private requestedFields(
        model: Type<unknown> | undefined,
        paths: PathTree,
        prefix: string,
        optional: boolean,
    ): ExpandField[] {
        const fields: ExpandField[] = []
        for (const [field, childPaths] of paths) {
            const path = prefix + field
            const targetPath = model ? modelFieldTarget(model, field) : undefined
            const target = targetPath ? this.targets.get(targetPath) : undefined
            const nestedModel = model && !target ? modelFieldClass(model, field) : undefined
            if (!target && !(nestedModel && childPaths.size)) {
                if (optional)
                    continue
                throw expandError('EXPAND_NOT_POSSIBLE', path)
            }
            const children = this.requestedFields(target?.model ?? nestedModel, childPaths, `${path}.`, optional)
            fields.push({field, path, target, nestedModel, optional, children})
        }
        return fields
    }

    /**
     * `expand=all`: the id fields of the response class whose target the caller may read, besides the requested
     * ones; optional, so ids out of the caller's scope become null
     */
    private async allFields(model: Type<unknown>, requested: PathTree, req: Request): Promise<ExpandField[]> {
        const fields: ExpandField[] = []
        for (const field of modelFields(model)) {
            const targetPath = modelFieldTarget(model, field)
            const target = targetPath ? this.targets.get(targetPath) : undefined
            if (target && !requested.has(field) && await this.isAllowed(target, req))
                fields.push({field, path: field, target, optional: true, children: []})
        }
        return fields
    }

    /**
     * Expands the fields on the objects of one level, then their child fields on the objects this gives: one
     * read per path, however many objects there are
     */
    private async expandFields(objects: ResponseObject[], fields: ExpandField[], req: Request): Promise<void> {
        for (const field of fields) {
            const nextObjects = field.target
                ? await this.expandReferences(objects, field, req)
                : nestedObjects(objects, field)
            if (field.children.length && nextObjects.length)
                await this.expandFields(nextObjects, field.children, req)
        }
    }

    /**
     * Sets `<field>_expand` on every object to the object its id points to, all read from the target in one
     * go; an id array gives an array in the same order, null gives null. Returns the objects read.
     * A value that is neither (e.g. a field hidden for the role) is 422, an id the caller may not read 403.
     * An optional field gets only what could be read: no `<field>_expand` for such an id, an array without it.
     */
    private async expandReferences(objects: ResponseObject[], field: ExpandField, req: Request): Promise<ResponseObject[]> {
        const referencing = objects.filter(object => {
            const value = object[field.field]
            return value === null || isId(value) || (Array.isArray(value) && value.every(isId))
        })
        if (referencing.length < objects.length && !field.optional)
            throw expandError('EXPAND_NOT_POSSIBLE', field.path)

        const ids = [...new Set(referencing.flatMap(object => [object[field.field]].flat()).filter(isId).map(String))]
        let objectsById = new Map<string, ResponseObject>()
        if (ids.length) {
            if (await this.isAllowed(field.target, req))
                objectsById = await this.readByIds(field.target, ids, req)
            else if (!field.optional)
                throw expandError('EXPAND_FORBIDDEN', field.path)
        }
        if (!field.optional && ids.some(id => !objectsById.has(id)))
            throw expandError('EXPAND_FORBIDDEN', field.path)

        const name = `${field.field}${EXPAND_SUFFIX}`
        for (const object of referencing) {
            const value = object[field.field]
            if (value === null)
                object[name] = null
            else if (Array.isArray(value))
                object[name] = value.map(String).filter(id => objectsById.has(id)).map(id => objectsById.get(id))
            else if (objectsById.has(String(value)))
                object[name] = objectsById.get(String(value))
        }
        return [...objectsById.values()]
    }

    // nested filters

    /**
     * The nested filter parameters of a collection read (`customer_id.status`). With allow_unknown_params,
     * dotted parameters that don't start with an expandable field are left to the endpoint, which ignores them.
     */
    private nestedFilterQuery(req: Request, model: Type<unknown> | undefined): Query {
        const ignoreUnknown = isAllowUnknownParams(req.query as QueriesDictionary)
        const keys = Object.keys(req.query ?? {})
            .filter(isNestedFilterKey)
            .filter(key => !ignoreUnknown || (model && modelFieldTarget(model, key.split('.')[0])))
        return Object.fromEntries(keys.map(key => [key, req.query[key]]))
    }

    /**
     * Resolves the nested filters of one level into id lists of its fields, deeper levels first
     * @param query the dotted parameters of the level, relative to it (`contact_id.email` on contracts)
     * @param prefix path of the level in the request (`contract_id.`), for errors
     */
    private async resolveNestedFilters(
        model: Type<unknown> | undefined,
        query: Query,
        prefix: string,
        req: Request,
    ): Promise<NestedFilter[]> {
        const queryByField = new Map<string, {query: Query, parameters: string[]}>()
        for (const [key, value] of Object.entries(query)) {
            const [field, ...rest] = key.split('.')
            if (!field || rest.some(segment => !segment))
                throw invalidPathError(prefix + key, prefix + key)
            if (!queryByField.has(field))
                queryByField.set(field, {query: {}, parameters: []})
            const fieldQuery = queryByField.get(field)
            fieldQuery.query[rest.join('.')] = value
            fieldQuery.parameters.push(key)
        }
        const filters: NestedFilter[] = []
        for (const [field, {query, parameters}] of queryByField) {
            const path = prefix + field
            const requestParameters = parameters.map(parameter => prefix + parameter)
            const targetPath = model ? modelFieldTarget(model, field) : undefined
            if (!targetPath)
                throw expandError('EXPAND_NOT_POSSIBLE', path, requestParameters)
            const target = this.targets.get(targetPath)
            if (!await this.isAllowed(target, req))
                throw expandError('EXPAND_FORBIDDEN', path, requestParameters)
            const ids = await this.matchingTargetIds(target, query, `${path}.`, requestParameters, req)
            filters.push({field, parameters, ids, applied: false})
        }
        return filters
    }

    /**
     * Ids of the target rows matching the filters of a level, read as the caller (rows outside the caller's
     * scope don't match); 422 when they are more than expand.filter_max_ids
     */
    private async matchingTargetIds(
        target: ExpandTarget,
        query: Query,
        prefix: string,
        requestParameters: string[],
        req: Request,
    ): Promise<string[]> {
        const reserved = Object.keys(query).find(key => reservedQueryParamKeys.includes(key))
        if (reserved)
            throw expandError('EXPAND_NOT_POSSIBLE', prefix + reserved, [prefix + reserved])
        const deeperQuery = Object.fromEntries(Object.entries(query).filter(([key]) => isNestedFilterKey(key)))
        const filters = await this.resolveNestedFilters(target.model, deeperQuery, prefix, req)
        const max = filterMaxIds()
        let result: unknown
        try {
            result = await target.readAll(subRequest(req, this.targetUrl(target), {...query, page: '1', rows: `${max + 1}`}, filters))
        } catch (err) {
            throw nestedFilterError(err, prefix)
        }
        assertFiltersApplied(filters, prefix)
        const rows = responseObjects(result)
        if (rows.length > max)
            throw expandError('EXPAND_NOT_POSSIBLE', prefix.slice(0, -1), requestParameters)
        return rows.map(row => String(row.id))
    }

    // targets

    private discoverTargets(): void {
        if (this.targets.size)
            return
        for (const wrapper of this.discovery.getControllers()) {
            const instance = wrapper.instance as {readAll?: (req: Request) => Promise<unknown>} | undefined
            const readAll = instance?.readAll
            if (typeof readAll != 'function' || Reflect.getMetadata(PATH_METADATA, readAll) === undefined)
                continue
            const controller = wrapper.metatype
            // roles and licenses as RolesGuard and LicenseGuard read them
            const target: Omit<ExpandTarget, 'path'> = {
                readAll: readAll.bind(instance),
                roles: this.reflector.getAllAndMerge<string[]>('rbacroles', [readAll, controller]),
                licenses: this.reflector.get<string[]>('licenses', readAll)
                    ?? this.reflector.get<string[]>('licenses', controller)
                    ?? [],
                model: responseModel(readAll),
            }
            for (const path of resourcePaths(controller, readAll)) {
                if (!this.targets.has(path))
                    this.targets.set(path, {...target, path})
            }
        }
    }

    private async isAllowed(target: ExpandTarget, req: Request): Promise<boolean> {
        const role = (req.user as {role?: string} | undefined)?.role
        if (target.roles.length && !target.roles.includes(role))
            return false
        return !target.licenses.length || await this.licenseService.areLicensesActive(target.licenses)
    }

    private async readByIds(target: ExpandTarget, ids: string[], req: Request): Promise<Map<string, ResponseObject>> {
        const objectsById = new Map<string, ResponseObject>()
        const url = this.targetUrl(target)
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE)
            const result = await target.readAll(subRequest(req, url, {id: chunk.join(','), page: '1', rows: `${chunk.length}`}))
            for (const object of responseObjects(result))
                objectsById.set(String(object.id), object)
        }
        return objectsById
    }

    // the url response DTOs build their links from
    private targetUrl(target: ExpandTarget): string {
        const prefix = this.appConfig.getGlobalPrefix().replace(/^\/|\/$/g, '')
        return `/${prefix ? `${prefix}/` : ''}${target.path}`
    }
}
