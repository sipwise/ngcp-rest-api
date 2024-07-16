import {ServiceRequest} from '../interfaces/service-request.interface'
import {BadRequestException} from '@nestjs/common'
import {ApiPropertyOptional} from '@nestjs/swagger'

interface Join {
    alias: string
    property: string
}

enum Order {
    ASC = 'ASC',
    DESC = 'DESC'
}

export class SearchLogic {
    joins?: Join[]
    aliases?: {[key: string]: string}
    searchableFields: string[]
    @ApiPropertyOptional({default: 1})
        page: number
    @ApiPropertyOptional({default: 10})
        rows: number
    @ApiPropertyOptional({description: 'field name to order by', name: 'order_by'})
        orderBy: string
    @ApiPropertyOptional({default: Order.ASC.toLowerCase()})
        order: Order = Order.ASC
    @ApiPropertyOptional({default: false, name: 'search_or'})
        searchOr: boolean

    constructor(sr: ServiceRequest, searchableFields: string[], joins?: Join[], aliases?: {[key: string]: string}) {
        this.searchableFields = searchableFields
        delete this.searchableFields['_alias']
        delete this.searchableFields['_joins']

        this.joins = joins
        this.aliases = aliases

        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(sr)
        this.page = page
        this.rows = rows

        if (sr.query['order_by'] != null) {
            this.orderBy = sr.query['order_by']
            if (!searchableFields.includes(this.orderBy))
                throw new BadRequestException()
            if (this.aliases && this.orderBy in this.aliases)
                this.orderBy = this.aliases[this.orderBy]
            this.order = sr.query['order_by_direction'] != null && sr.query['order_by_direction'].toUpperCase() === Order.DESC ? Order.DESC : Order.ASC
        }
        this.searchOr = sr.query['search_or'] != null && (sr.query['search_or'] === '1' || sr.query['search_or'] === 'true')
    }

    static getPaginationFromServiceRequest(sr: ServiceRequest): [number, number] {
        const page: number = sr.query['page'] || 1
        if (page <= 0)
            throw new BadRequestException()

        const rows: number = sr.query['rows'] || 10
        if (rows <= 0)
            throw new BadRequestException()
        return [page, rows]
    }
}
