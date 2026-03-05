import {BadRequestException} from '@nestjs/common'

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
            throw new BadRequestException(`invalid order_by value ${orderBy}`)
    }

    const orderByDir = (sr.req.query['order_by_direction'] as string ?? '').toLowerCase()
    if (orderByDir && (orderByDir != 'asc' && orderByDir != 'desc')) {
        throw new BadRequestException(`invalid order_by_direction value ${orderByDir}`)
    }

    const orderByDirA = orderByDir == 'desc' ? 1 : -1
    const orderByDirB = orderByDir == 'desc' ? -1 : 1

    const sorted = array.sort((a, b) => typeof a[orderBy] == 'string'
        ? (a[orderBy].localeCompare(b[orderBy], undefined, {numeric: true}))
        : (a[orderBy] < b[orderBy] ? orderByDirA : orderByDirB),
    )

    return paginate<T>(sorted, +rows, +page)
}

