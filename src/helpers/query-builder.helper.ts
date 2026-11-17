import {BaseEntity, Brackets, SelectQueryBuilder} from 'typeorm'

import {SearchLogic} from './search-logic.helper'

import {reservedQueryParamKeys as reservedQueryParams} from '~/config/constants.config'
import {DateTimeKind} from '~/decorators/date-time-field.decorator'
import {isAllowUnknownParams} from '~/helpers/allow-unknown-params.helper'
import {
    DateTimeInputError,
    inputToInstant,
    inputToPlatformDateTime,
    inputZone,
    parseDateTimeInput,
} from '~/helpers/date-time-input.helper'
import {InvalidParameterException, errorMessage} from '~/helpers/errors.helper'
import {platformTimezone} from '~/helpers/timezone.helper'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {LazyFieldSource} from '~/interfaces/lazy-field-source.interface'
import {QueriesDictionary, ServiceRequest} from '~/interfaces/service-request.interface'

/**
 * Search DTO `_alias` entry of a date/time filter: the value is parsed like the field (@DateTimeField():
 * naive values in the request's zone; @LocalDateTimeField(): compared as stored platform time), wildcards
 * are rejected. `field` is the column expression, also used by order_by.
 */
export interface DateTimeFilter {
    dateTime: DateTimeKind.DateTime | DateTimeKind.LocalDateTime
    field: string
    comparator: '=' | '>=' | '<='
}

export function dateTimeFilter(
    kind: DateTimeFilter['dateTime'],
    field: string,
    comparator: DateTimeFilter['comparator'] = '=',
): DateTimeFilter {
    return {dateTime: kind, field, comparator}
}

function isDateTimeFilter(alias: unknown): alias is DateTimeFilter {
    return typeof alias == 'object' && alias != null && 'dateTime' in alias
}

function filterError(parameter: string, error: ErrorMessage): InvalidParameterException {
    return new InvalidParameterException([{parameter, code: error.errorCode, message: `${parameter} ${error.message}`}])
}

/**
 * Column stored as 0/1 behind a boolean entity property; its filter values are true/false (also 1/0)
 */
function isBooleanColumn<T extends BaseEntity>(qb: SelectQueryBuilder<T>, qbAlias: string, property: string): boolean {
    const alias = qb.expressionMap.aliases.find(a => a.name == qbAlias)
    if (!alias?.hasMetadata)
        return false
    const column = alias.metadata.findColumnWithPropertyPath(property)
        ?? alias.metadata.findColumnWithDatabaseName(property)
    if (!column)
        return false
    const target = column.target
    return column.type === 'boolean' || column.type === Boolean
        || typeof target == 'function' && Reflect.getMetadata('design:type', target.prototype, column.propertyName) === Boolean
}

function booleanFilterValue(parameter: string, value: string): number {
    const parsed = SearchLogic.toBoolean(value)
    if (parsed == undefined)
        throw filterError(parameter, errorMessage('INVALID_BOOLEAN'))
    return parsed ? 1 : 0
}

function dateTimeFilterValue(parameter: string, value: string, kind: DateTimeFilter['dateTime']): Date | string {
    if (value.includes('*'))
        throw filterError(parameter, errorMessage('DATE_TIME_WILDCARD'))
    try {
        const input = parseDateTimeInput(value, kind)
        if (kind == DateTimeKind.DateTime)
            return new Date(inputToInstant(input, 'plain' in input ? inputZone() : platformTimezone()).epochMilliseconds)
        return inputToPlatformDateTime(input).toString({smallestUnit: 'second'}).replace('T', ' ')
    } catch (err) {
        if (err instanceof DateTimeInputError)
            throw filterError(parameter, err.error)
        throw err
    }
}

export function configureQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: QueriesDictionary, searchLogic: SearchLogic): void {
    addJoinFilterToQueryBuilder(qb, params, searchLogic)
    addSearchFilterToQueryBuilder(qb, params, searchLogic)
    addNestedFilterToQueryBuilder(qb, searchLogic)
    addOrderByToQueryBuilder(qb, params, searchLogic)
    addPaginationToQueryBuilder(qb, searchLogic)
    qb.andWhere('1 = 1')
}

function addJoinFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: QueriesDictionary, searchLogic: SearchLogic): void {
    for (const joinCondition in searchLogic.joins) {
        const joinTable = searchLogic.joins[joinCondition].alias
        const joinColumn = searchLogic.joins[joinCondition].property
        if (joinTable != undefined && joinColumn != undefined) {
            qb.leftJoinAndSelect(`${qb.alias}.${joinColumn}`, `${joinColumn}`)
            if (params[joinColumn] != null) {
                qb.andWhere(`${joinTable}.${joinColumn} = :${joinColumn}`, {[`${joinColumn}`]: params[joinColumn]})
            }
        }
    }
}

function addSearchFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: QueriesDictionary, searchLogic: SearchLogic): void {
    const allowUnknownParams = isAllowUnknownParams(params)
    const orClauses: [string, Record<string, unknown>][] = []

    if (!allowUnknownParams) {
        const nested = (searchLogic.nestedFilters ?? []).flatMap(filter => filter.parameters)
        const unknown = Object.keys(params).filter(field => !reservedQueryParams.includes(field)
            && !searchLogic.searchableFields.includes(field) && !nested.includes(field))
        if (unknown.length) {
            throw new InvalidParameterException(unknown.map(parameter => ({
                parameter,
                code: 'whitelistValidation',
                message: `parameter ${parameter} should not exist`,
            })))
        }
    }

    Object.keys(params).forEach((searchField: string) => {
        if (reservedQueryParams.includes(searchField))
            return

        if (!searchLogic.searchableFields.includes(searchField))
            return

        const propertyAlias = searchLogic.aliases?.[searchField] ?? searchField
        const [qbAlias, alias] = typeof propertyAlias === 'string' && propertyAlias.includes('.')
            ? propertyAlias.split('.')
            : [qb.alias, propertyAlias]

        const searchValue = params[searchField].toString()
        const values = searchValue.split(',').map(val => val.trim())

        const complexSearch = typeof propertyAlias === 'object' && propertyAlias['format']
        const conditions: string[] = []
        const parameters: Record<string, unknown> = {}

        if (isDateTimeFilter(propertyAlias)) {
            values.forEach((value, index) => {
                const paramKey = `${searchField}_${index}`
                conditions.push(`${propertyAlias.field} ${propertyAlias.comparator} :${paramKey}`)
                parameters[paramKey] = dateTimeFilterValue(searchField, value, propertyAlias.dateTime)
            })
        } else if (complexSearch) {
            const field = propertyAlias['field']
            const comparator = propertyAlias['comparator']
            const transform = propertyAlias['transform']
            const where = propertyAlias['where'] as ((paramKey: string) => string) | undefined

            values.forEach((value, index) => {
                const paramKey = `${searchField}_${index}`
                const formattedValue = complexSearch([value.replace(/\*/g, '%')])

                if (where) {
                    conditions.push(where(paramKey))
                } else if (transform) {
                    conditions.push(`${transform}(${qbAlias}.${field}) ${comparator} ${transform}(:${paramKey})`)
                } else {
                    conditions.push(`${qbAlias}.${field} ${comparator} :${paramKey}`)
                }
                parameters[paramKey] = formattedValue
            })
        } else if (typeof alias == 'string' && isBooleanColumn(qb, qbAlias, alias)) {
            conditions.push(`${qbAlias}.${alias} IN (:...${alias}_in)`)
            parameters[`${alias}_in`] = values.map(value => booleanFilterValue(searchField, value))
        } else {
            const exactValues = values.filter(value => !value.includes('*'))
            const likeValues = values.filter(value => value.includes('*'))

            if (exactValues.length > 0) {
                conditions.push(`${qbAlias}.${alias} IN (:...${alias}_in)`)
                parameters[`${alias}_in`] = exactValues
            }

            likeValues.forEach((value, index) => {
                const paramKey = `${alias}_like_${index}`
                conditions.push(`${qbAlias}.${alias} LIKE :${paramKey}`)
                parameters[paramKey] = value.replace(/\*/g, '%')
            })
        }

        const whereClause = `(${conditions.join(' OR ')})`
        if (searchLogic.searchOr) {
            orClauses.push([whereClause, parameters])
        } else {
            qb.andWhere(whereClause, parameters)
        }
    })
    if (orClauses.length)
        qb.andWhere(new Brackets(b => orClauses.forEach(([where, parameters]) => b.orWhere(where, parameters))))
}

/**
 * Column of a search field for an id constraint: its `_alias` (`'alias.column'`, a column of the main alias or
 * the `field` of a complex alias); undefined for `where` and date/time filters
 */
function searchFieldColumn<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic, searchField: string): string | undefined {
    if (!searchLogic.searchableFields.includes(searchField))
        return undefined
    const propertyAlias = searchLogic.aliases?.[searchField] ?? searchField
    if (typeof propertyAlias == 'string')
        return propertyAlias.includes('.') ? propertyAlias : `${qb.alias}.${propertyAlias}`
    if (isDateTimeFilter(propertyAlias) || 'where' in propertyAlias || typeof propertyAlias['field'] != 'string')
        return undefined
    return `${qb.alias}.${propertyAlias['field']}`
}

/**
 * Nested filters (contract_id.contact_id.email=foo) come as the resolved ids of their field: always AND,
 * also with search_or, and no match when no id was found
 */
function addNestedFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic): void {
    for (const filter of searchLogic.nestedFilters ?? []) {
        const column = searchFieldColumn(qb, searchLogic, filter.field)
        if (!column)
            continue
        const paramKey = `${filter.field}_nested_ids`
        if (filter.ids.length)
            qb.andWhere(`${column} IN (:...${paramKey})`, {[paramKey]: filter.ids})
        else
            qb.andWhere('1 = 0')
        filter.applied = true
    }
}

export function addOrderByToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, _params: QueriesDictionary, searchLogic: SearchLogic): void {
    if (searchLogic.orderBy != null) {
        qb.addOrderBy(searchLogic.orderBy, searchLogic.orderByDirection)
    }
}

export function addPaginationToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic): void {
    qb.limit(searchLogic.rows)
    qb.offset(searchLogic.rows * (searchLogic.page - 1))
}

/**
 * Number of rows of the query per value of `column` (e.g. the items of lazy fields per owner of a page), in one
 * grouped query; owners without rows are missing from the map
 */
export async function countPerId<T extends BaseEntity>(qb: SelectQueryBuilder<T>, column: string): Promise<Map<number, number>> {
    const rows = await qb
        .select(column, 'id')
        .addSelect('COUNT(*)', 'count')
        .groupBy(column)
        .orderBy()
        .getRawMany<{id: number, count: string}>()
    return new Map(rows.map((row): [number, number] => [+row.id, +row.count]))
}

interface SearchDto {
    _alias?: Record<string, string | object>
}

export interface SqlFieldSourceOptions<R extends BaseEntity, T> {
    // property of the internal entity holding the loaded items
    property: string
    // the rows of the field's items of the entities, in their default order
    rows: (itemIds: number[]) => Promise<SelectQueryBuilder<R>>
    // column of the rows holding the id of the entity owning them
    itemId: string
    search?: new () => SearchDto
    // maps the rows of a page or of a load, one item per row in the same order
    toInternal: (rows: R[]) => T[] | Promise<T[]>
}

const ITEM_ID_COLUMN = 'lazy_item_id'

/**
 * Source of a lazy field stored in MariaDB: one grouped count per page of entities, one load of all inlined
 * entities, and `@<field>` pages filtered, ordered and paged in SQL (the requested order_by first, the default
 * order of the rows as tiebreaker)
 */
export function sqlFieldSource<R extends BaseEntity, T>(options: SqlFieldSourceOptions<R, T>): LazyFieldSource<T> {
    const {property, rows, itemId, search, toInternal} = options
    return {
        property,
        search,
        count: async (itemIds: number[]): Promise<Map<number, number>> => await countPerId(await rows(itemIds), itemId),
        load: async (itemIds: number[]): Promise<Map<number, T[]>> => {
            const qb = await rows(itemIds)
            const {entities, raw} = await qb.addSelect(itemId, ITEM_ID_COLUMN).getRawAndEntities<Record<string, unknown>>()
            // raw rows and entities match one to one as long as no row repeats an entity
            if (entities.length != raw.length)
                throw new Error(`lazy field ${property}: rows repeat entities`)
            const items = await toInternal(entities)
            const byId = new Map<number, T[]>()
            items.forEach((item, index) => {
                const id = +raw[index][ITEM_ID_COLUMN]
                if (!byId.has(id))
                    byId.set(id, [])
                byId.get(id).push(item)
            })
            return byId
        },
        page: async (id: number, sr: ServiceRequest): Promise<[T[], number]> => {
            const qb = await rows([id])
            const defaultOrder = qb.expressionMap.orderBys
            qb.orderBy()
            const searchDto: SearchDto = search ? new search() : {}
            configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(searchDto), undefined, searchDto._alias))
            const requestedOrder = qb.expressionMap.orderBys
            const tiebreakers = Object.entries(defaultOrder).filter(([sort]) => !(sort in requestedOrder))
            qb.orderBy({...requestedOrder, ...Object.fromEntries(tiebreakers)})
            const [page, totalCount] = await qb.getManyAndCount()
            return [await toInternal(page), totalCount]
        },
    }
}
