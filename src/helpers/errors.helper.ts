import {
    BadRequestException,
    ConflictException,
    HttpException,
    HttpStatus,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common'
import {ValidationError} from 'class-validator'
import {JsonPatchError} from 'fast-json-patch'
import {QueryError} from 'mysql2'
import {EntityNotFoundError, QueryFailedError, TypeORMError} from 'typeorm'

import {config} from '~/config/main.config'
import {dtoFieldName} from '~/helpers/dto-fields.helper'
import {obfuscatePasswordValidationErrors} from '~/helpers/password-obfuscator.helper'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import errors from '~/localisation/en/errors.json'

export interface ErrorEntry {
    pointer?: string
    parameter?: string
    code: string
    message: string
}

export enum ErrorCode {
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INVALID_PARAMETER = 'INVALID_PARAMETER',
    INVALID_JSON = 'INVALID_JSON',
    INVALID_JSON_PATCH = 'INVALID_JSON_PATCH',
    JSON_PATCH_CONFLICT = 'JSON_PATCH_CONFLICT',
}

const errorListMessages = {
    [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
    [ErrorCode.INVALID_PARAMETER]: 'Validation failed',
    [ErrorCode.INVALID_JSON_PATCH]: 'Invalid JSON Patch',
    [ErrorCode.JSON_PATCH_CONFLICT]: 'JSON Patch conflict',
}

/**
 * Entry messages start lowercase, unless with an acronym or a digit (RFC, JSON, 2FA)
 */
function entryMessage(message: string): string {
    if (typeof message != 'string' || /^([A-Z0-9]{2,}\b|\d)/.test(message))
        return message
    return message.charAt(0).toLowerCase() + message.slice(1)
}

/**
 * Builds the response body of an exception with errors[], capped at `common.post_many_return_link_max` entries
 */
function errorListBody(errorCode: string, message: string, list: ErrorEntry[]): object {
    const max = config.common.post_many_return_link_max
    let shown = list
    if (max > 0 && list.length > max) {
        shown = list.slice(0, max)
        message = `${message} (${max} of ${list.length} errors shown)`
    }
    return {message, errorCode, errors: shown.map(entry => ({...entry, message: entryMessage(entry.message)}))}
}

export interface ErrorListException extends HttpException {
    readonly errorList: ErrorEntry[]
}

export class ValidationFailedException extends UnprocessableEntityException implements ErrorListException {
    constructor(readonly errorList: ErrorEntry[]) {
        super(errorListBody(ErrorCode.VALIDATION_FAILED, errorListMessages[ErrorCode.VALIDATION_FAILED], errorList))
    }
}

export class InvalidParameterException extends BadRequestException implements ErrorListException {
    constructor(readonly errorList: ErrorEntry[]) {
        super(errorListBody(ErrorCode.INVALID_PARAMETER, errorListMessages[ErrorCode.INVALID_PARAMETER], errorList))
    }
}

export class InvalidJsonPatchException extends BadRequestException implements ErrorListException {
    constructor(readonly errorList: ErrorEntry[]) {
        super(errorListBody(ErrorCode.INVALID_JSON_PATCH, errorListMessages[ErrorCode.INVALID_JSON_PATCH], errorList))
    }
}

export class JsonPatchConflictException extends ConflictException implements ErrorListException {
    constructor(readonly errorList: ErrorEntry[]) {
        super(errorListBody(ErrorCode.JSON_PATCH_CONFLICT, errorListMessages[ErrorCode.JSON_PATCH_CONFLICT], errorList))
    }
}

// precedence when bulk items fail differently: the request can't be interpreted before it conflicts or is invalid
const errorListPrecedence = [InvalidParameterException, InvalidJsonPatchException, JsonPatchConflictException, ValidationFailedException]

export function isErrorListException(err: unknown): err is ErrorListException {
    return errorListPrecedence.some(type => err instanceof type)
}

/**
 * Merges the errors of several items into one exception of the class with the highest precedence
 */
export function mergeErrorListExceptions(list: ErrorListException[]): ErrorListException {
    for (const type of errorListPrecedence) {
        const matching = list.filter(err => err instanceof type)
        if (matching.length)
            return new type(matching.flatMap(err => err.errorList))
    }
    return undefined
}

// a concurrent transaction changed what this one read or locked; the TransactionInterceptor retries the request
export class TransactionConflictException extends UnprocessableEntityException {}

export function handleTypeORMError(err: Error): Error {
    if (err instanceof TypeORMError) {
        switch (err.constructor) {
            case EntityNotFoundError:
                return new NotFoundException()
            case QueryFailedError:
            // eslint-disable-next-line no-case-declarations
                const qErr = <QueryFailedError<QueryError>>err
                switch (qErr.driverError.code) {
                    case 'ER_DUP_ENTRY':
                        return new UnprocessableEntityException(errorMessage('DUPLICATE_ENTRY'))
                    case 'ER_CHECKREAD':
                    case 'ER_LOCK_DEADLOCK':
                        return new TransactionConflictException()
                }
        }
        return new UnprocessableEntityException()
    }
    return err
}

/**
 * RFC 6901 escaping of one reference token
 */
export function escapePointerToken(token: string | number): string {
    return `${token}`.replace(/~/g, '~0').replace(/\//g, '~1')
}

/**
 * Flattens class-validator errors into one entry per failed constraint, recursing into nested objects and arrays.
 * Passwords are masked in the errors (they are logged), the entries carry no values.
 * @param list errors as returned by class-validator
 * @param prefix pointer of the validated object in the request body (`/7` for a bulk item)
 */
export function formatValidationErrors(list: ValidationError[], prefix = ''): ErrorEntry[] {
    obfuscatePasswordValidationErrors(list)
    const result: ErrorEntry[] = []
    for (const err of list ?? []) {
        const pointer = err.property == null || err.property === '' ? prefix : `${prefix}/${escapePointerToken(err.property)}`
        for (const [code, message] of Object.entries(err.constraints ?? {}))
            result.push({pointer, code, message})
        result.push(...formatValidationErrors(err.children, pointer))
    }
    return result
}

/**
 * Formats class-validator errors of query/path parameter objects
 */
export function formatParameterErrors(list: ValidationError[]): ErrorEntry[] {
    return formatValidationErrors(list).map(({pointer, code, message}) => ({
        parameter: pointer.slice(1).replace(/\//g, '.').replace(/~1/g, '/').replace(/~0/g, '~'),
        code,
        message,
    }))
}

const jsonPatchConflicts = [
    'TEST_OPERATION_FAILED',
    'OPERATION_PATH_UNRESOLVABLE',
    'OPERATION_FROM_UNRESOLVABLE',
    'OPERATION_PATH_CANNOT_ADD',
    'OPERATION_VALUE_OUT_OF_BOUNDS',
]

/**
 * Converts a fast-json-patch error into the 400 (malformed patch) or 409 (conflicts with the resource) exception
 * @param err error thrown or returned by fast-json-patch
 * @param index index of the failed operation in the patch document
 * @param base pointer of the patch document in the request body (`/5` in a bulk PATCH)
 */
export function jsonPatchException(err: JsonPatchError, index: number, base = ''): ErrorListException {
    const name = err.name
    let member = ''
    if (name.startsWith('OPERATION_OP_'))
        member = '/op'
    else if (name.startsWith('OPERATION_PATH_'))
        member = '/path'
    else if (name.startsWith('OPERATION_FROM_'))
        member = '/from'
    else if (name.startsWith('OPERATION_VALUE_') || name == 'TEST_OPERATION_FAILED')
        member = '/value'
    const pointer = name == 'SEQUENCE_NOT_AN_ARRAY' ? base : `${base}/${index}${member}`
    // the message of fast-json-patch errors continues with the operation and the whole document
    const entry = {pointer, code: name, message: err.message.split('\n')[0]}
    return jsonPatchConflicts.includes(name)
        ? new JsonPatchConflictException([entry])
        : new InvalidJsonPatchException([entry])
}

/**
 * Error of a path/query parameter, or of the request body when the value came from it (`@ParamOrBody`)
 * @param name parameter name
 * @param code validator constraint name
 * @param message human text
 * @param pointer pointer into the body if the value came from the body
 */
export function parameterException(name: string, code: string, message: string, pointer?: string): HttpException {
    return pointer !== undefined
        ? new ValidationFailedException([{pointer, code, message}])
        : new InvalidParameterException([{parameter: name, code, message}])
}

/**
 * Pointer of an item in the request body: `/<key>` for a bulk body (array or object keyed by id), '' for a single item
 * @param body request body
 * @param key index or id of the item
 */
export function bodyItemPointer(body: unknown, key: string | number): string {
    const isBulk = Array.isArray(body) || (body != null && typeof body == 'object' && `${key}` in body)
    return isBulk ? `/${escapePointerToken(key)}` : ''
}

/**
 * Error message of an errors.json key outside of the i18n service (guards, helpers, decorators)
 * @param key errors.json key
 * @param args values of the `{name}` placeholders
 */
export function errorMessage(key: keyof typeof errors, args: Record<string, unknown> = {}): ErrorMessage {
    const message = errors[key].message.replace(/\{(\w+)\}/g, (match: string, name: string) => name in args ? `${args[name]}` : match)
    return {message, errorCode: key}
}

/**
 * API error (errors.json) of one or more request items, `errors[].code` is the errors.json key.
 * errorCode and message of the response are the first entry's, the entries are in request order.
 */
export class ApiErrorException extends HttpException implements ErrorListException {
    constructor(readonly errorList: ErrorEntry[], status: number = HttpStatus.UNPROCESSABLE_ENTITY) {
        super(errorListBody(errorList[0].code, errorList[0].message, errorList), status)
    }
}

/**
 * Collects the API errors of the items of a request
 */
export class ApiErrors {
    private readonly list: ErrorEntry[] = []

    /**
     * @param error errors.json entry (`i18n.t('errors.X')`)
     * @param pointer pointer of the item/field in the request body
     */
    add(error: ErrorMessage, pointer: string): this {
        this.list.push({pointer, code: error.errorCode, message: error.message})
        return this
    }

    get length(): number {
        return this.list.length
    }

    throwIfAny(status?: number): void {
        if (this.list.length)
            throw new ApiErrorException(this.list, status)
    }
}

/**
 * API error of one request item/field
 * @param error errors.json entry (`i18n.t('errors.X')`)
 * @param pointer pointer of the item/field in the request body
 * @param status http status, 422 by default
 */
export function apiError(error: ErrorMessage, pointer: string, status?: number): ApiErrorException {
    return new ApiErrorException([{pointer, code: error.errorCode, message: error.message}], status)
}

/**
 * Runs a check per item (concurrently) and reports the first API error of every failing item, in request
 * order. Other errors are rethrown.
 * @param items request items, array (POST) or dictionary by id (PUT/PATCH)
 * @param check check of one item, gets its index or id
 */
export async function checkItems<T>(items: T[] | Record<string, T>, check: (item: T, key: number | string) => Promise<void>): Promise<void> {
    const keys: (number | string)[] = Array.isArray(items) ? items.map((_, index) => index) : Object.keys(items)
    const results = await Promise.allSettled(keys.map(key => check(items[key], key)))
    const failed: unknown[] = results.filter(result => result.status == 'rejected').map(result => (result as PromiseRejectedResult).reason as unknown)
    const other = failed.find(err => !(err instanceof ApiErrorException))
    if (other)
        throw other
    if (failed.length)
        throw new ApiErrorException((failed as ApiErrorException[]).flatMap(err => err.errorList), (failed[0] as ApiErrorException).getStatus())
}

/**
 * Whether the request addresses a single resource by its path id (`:id`)
 */
export function isSingleItemRequest(sr: ServiceRequest): boolean {
    return sr?.params?.id != null
}

/**
 * Pointer of a request item and a field in it.
 * Item: '' for single routes (`:id`) and single POST bodies, `/<index>` in a bulk array, `/<id>` in a bulk dictionary.
 * Fields: internal names, translated by the map the request DTO attached (`withDtoFields`), else snake_case;
 * numbers are array indexes.
 * @param sr service request of the endpoint
 * @param key index (POST) or id (PUT/PATCH) of the item
 * @param entity internal entity of the item, needed for field names
 * @param path internal field names and array indexes
 */
export function itemPointer(sr: ServiceRequest, key: number | string, entity?: unknown, ...path: (number | string)[]): string {
    return (isSingleItemRequest(sr) ? '' : bodyItemPointer(sr?.req?.body, key)) + fieldPointer(entity, path)
}

/**
 * Pointer of a CSV row and a field in it: `/<0-based data row>/<field>`, like a bulk POST array
 * @param row index of the data row (the row after the header is 0)
 * @param entity internal entity of the row, needed for field names
 * @param path internal field names and array indexes
 */
export function rowPointer(row: number, entity?: unknown, ...path: (number | string)[]): string {
    return `/${row}${fieldPointer(entity, path)}`
}

function fieldPointer(entity: unknown, path: (number | string)[]): string {
    let pointer = ''
    let current = entity
    for (const token of path) {
        pointer += `/${escapePointerToken(typeof token == 'number' ? token : dtoFieldName(current, token))}`
        current = current != null && typeof current == 'object' ? current[token] : undefined
    }
    return pointer
}

/**
 * Pointer of an id of a bulk request: its index in a DELETE body array, else the item of the id (`/<id>`)
 * @param sr service request of the endpoint
 * @param id id of the item
 */
export function idPointer(sr: ServiceRequest, id: number | string): string {
    const body = sr?.req?.body
    if (sr?.req?.method == 'DELETE' && Array.isArray(body)) {
        const index = body.findIndex(value => `${value}` == `${id}`)
        return index >= 0 ? `/${index}` : ''
    }
    return itemPointer(sr, id)
}

/**
 * Reports the requested ids that were not found: 404 for a single route, else 422 with an entry per unknown id
 * @param sr service request of the endpoint
 * @param ids requested ids
 * @param foundIds ids that were found
 * @param error errors.json entry (`i18n.t('errors.ENTRY_NOT_FOUND')`)
 */
export function throwMissingIds(sr: ServiceRequest, ids: (number | string)[], foundIds: (number | string)[], error: ErrorMessage): void {
    const found = new Set(foundIds.map(id => `${id}`))
    const missing = ids.filter(id => !found.has(`${id}`))
    if (!missing.length)
        return
    if (isSingleItemRequest(sr))
        throw new NotFoundException()
    throw new ApiErrorException(missing.map(id => ({pointer: idPointer(sr, id), code: error.errorCode, message: error.message})))
}

/**
 * Ids that can be read, with the caller's scoped read of one item: ids failing with 404 (unknown or out of the
 * user's scope) are left out, other errors are rethrown
 * @param ids requested ids
 * @param read read of one item
 */
export async function readFoundIds<T extends number | string>(ids: T[], read: (id: T) => Promise<unknown>): Promise<T[]> {
    const found: T[] = []
    for (const id of ids) {
        try {
            await read(id)
            found.push(id)
        } catch (err) {
            if (!(err instanceof NotFoundException))
                throw err
        }
    }
    return found
}
