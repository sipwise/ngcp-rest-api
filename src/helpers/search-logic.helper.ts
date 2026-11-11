import {ApiPropertyOptional} from '@nestjs/swagger'

import {InvalidParameterException} from '~/helpers/errors.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface Join {
    alias: string
    property: string
}

enum OrderByDirection {
    ASC = 'ASC',
    DESC = 'DESC'
}

export class SearchLogic {
    joins?: Join[]
    aliases?: {[key: string]: string | object}
    searchableFields: string[]
    @ApiPropertyOptional({default: 1})
        page: number
    @ApiPropertyOptional({default: 10})
        rows: number
    @ApiPropertyOptional({description: 'field name to order by', name: 'order_by'})
        orderBy: string
    @ApiPropertyOptional({default: OrderByDirection.ASC.toLowerCase(), name: 'order_by_direction'})
        orderByDirection: OrderByDirection = OrderByDirection.ASC
    @ApiPropertyOptional({default: false, name: 'search_or'})
        searchOr: boolean

    constructor(sr: ServiceRequest, searchableFields: string[], joins?: Join[], aliases?: {[key: string]: string | object}) {
        this.searchableFields = searchableFields
        delete this.searchableFields['_alias']
        delete this.searchableFields['_joins']

        this.joins = joins
        this.aliases = aliases

        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(sr)
        this.page = page
        this.rows = rows

        if (sr.query['order_by'] != null) {
            this.orderBy = sr.query['order_by'].toString()
            if (!searchableFields.includes(this.orderBy) && this.orderBy !== 'id')
                throw new InvalidParameterException([{parameter: 'order_by', code: 'isIn', message: 'order_by must be a sortable field'}])
            if (this.aliases && this.orderBy in this.aliases) {
                const propertyAlias = this.aliases[this.orderBy]
                if (typeof propertyAlias == 'string')
                    this.orderBy = propertyAlias
                else if (typeof propertyAlias['field'] == 'string')
                    this.orderBy = propertyAlias['field'] as string
                else
                    throw new InvalidParameterException([{parameter: 'order_by', code: 'isIn', message: 'order_by must be a sortable field'}])
            }
            this.orderByDirection =
                sr.query['order_by_direction'] != null &&
                sr.query['order_by_direction'].toString().toUpperCase() === OrderByDirection.DESC
                    ? OrderByDirection.DESC
                    : OrderByDirection.ASC

        }
        this.searchOr = sr.query['search_or'] != null && (sr.query['search_or'] === '1' || sr.query['search_or'] === 'true')
    }

    static getPaginationFromServiceRequest(sr: ServiceRequest): [number, number] {
        const page: number = +sr.query['page'] || 1
        if (page <= 0)
            throw new InvalidParameterException([{parameter: 'page', code: 'min', message: 'page must not be less than 1'}])

        const rows: number = +sr.query['rows'] || 10
        if (rows <= 0)
            throw new InvalidParameterException([{parameter: 'rows', code: 'min', message: 'rows must not be less than 1'}])
        return [page, rows]
    }
}
