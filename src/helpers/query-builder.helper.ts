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
import {QueriesDictionary} from '~/interfaces/service-request.interface'

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
