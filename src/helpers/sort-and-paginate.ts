import {InvalidParameterException} from './errors.helper'
import {paginate} from './paginate.helper'

import {AppService} from '~/app.service'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export function sortAndPaginate<T>(array: T[], sr: ServiceRequest, defaultField: string): T[] {

    const page: string = (sr.req.query?.page as string) ?? `${AppService.config.common.api_default_query_page}`
    const rows: string = (sr.req.query?.rows as string) ?? `${AppService.config.common.api_default_query_rows}`

    if (!array.length)
        return paginate<T>(array, +rows, +page)

    const orderBy = sr.req.query['order_by'] as string ?? defaultField
    if (orderBy && array.length > 0) {
        if (!array[0][orderBy])
            throw new InvalidParameterException([{parameter: 'order_by', code: 'isIn', message: 'order_by must be a sortable field'}])
    }

    const orderByDir = (sr.req.query['order_by_direction'] as string ?? '').toLowerCase()
    if (orderByDir && (orderByDir != 'asc' && orderByDir != 'desc')) {
        throw new InvalidParameterException([{parameter: 'order_by_direction', code: 'isIn', message: 'order_by_direction must be one of the following values: asc, desc'}])
    }

    const orderByDirA = orderByDir == 'desc' ? 1 : -1
    const orderByDirB = orderByDir == 'desc' ? -1 : 1

    const sorted = array.sort((a, b) => typeof a[orderBy] == 'string'
        ? (a[orderBy].localeCompare(b[orderBy], undefined, {numeric: true}))
        : (a[orderBy] < b[orderBy] ? orderByDirA : orderByDirB),
    )

    return paginate<T>(sorted, +rows, +page)
}

