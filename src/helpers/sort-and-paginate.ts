import {ParsedQs} from 'qs'

import {InvalidParameterException} from './errors.helper'
import {paginate} from './paginate.helper'

import {AppService} from '~/app.service'
import {ServiceRequest} from '~/interfaces/service-request.interface'

function positiveNumber(query: ParsedQs, name: string, fallback: number): number {
    const value = query[name]
    const parsed = value === undefined ? fallback : +value || fallback
    if (parsed <= 0)
        throw new InvalidParameterException([{parameter: name, code: 'min', message: `${name} must not be less than 1`}])
    return parsed
}

/**
 * Order of two values of a field: numbers and dates by value, strings by their natural order (`a2` < `a10`),
 * null and undefined before all others (as MariaDB orders NULL)
 */
export function compareValues(a: unknown, b: unknown): number {
    if (a === b)
        return 0
    if (a == null || b == null)
        return a == null ? (b == null ? 0 : -1) : 1
    if (typeof a == 'string' && typeof b == 'string')
        return a.localeCompare(b, undefined, {numeric: true})
    return a < b ? -1 : a > b ? 1 : 0
}

/**
 * A page of an in-memory list, ordered by `order_by` (else `defaultField`) and `order_by_direction`, paged by
 * `page` and `rows`. 400 for an `order_by` field none of the entries has, an invalid direction, page or rows.
 */
export function sortAndPaginate<T>(array: T[], sr: ServiceRequest, defaultField?: string): T[] {
    const query = sr.req.query ?? {}
    const page = positiveNumber(query, 'page', AppService.config.common.api_default_query_page)
    const rows = positiveNumber(query, 'rows', AppService.config.common.api_default_query_rows)

    const direction = `${query.order_by_direction ?? 'asc'}`.toLowerCase()
    if (direction != 'asc' && direction != 'desc')
        throw new InvalidParameterException([{parameter: 'order_by_direction', code: 'isIn', message: 'order_by_direction must be one of the following values: asc, desc'}])

    const orderBy = query.order_by !== undefined ? `${query.order_by}` : defaultField
    if (!orderBy)
        return paginate<T>(array, rows, page)
    if (array.length && array.every(entry => entry[orderBy] === undefined))
        throw new InvalidParameterException([{parameter: 'order_by', code: 'isIn', message: 'order_by must be a sortable field'}])

    const sign = direction == 'desc' ? -1 : 1
    const sorted = [...array].sort((a, b) => sign * compareValues(a[orderBy], b[orderBy]))
    return paginate<T>(sorted, rows, page)
}
