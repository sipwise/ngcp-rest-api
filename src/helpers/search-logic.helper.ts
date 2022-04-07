import {ServiceRequest} from '../interfaces/service-request.interface'
import {BadRequestException} from '@nestjs/common'

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
    searchableFields: string[]
    rows: number
    page: number
    orderBy: string
    order: Order = Order.ASC
    searchOr: boolean

    constructor(sr: ServiceRequest, searchableFields: string[], joins?: Join[]) {
        this.joins = joins
        this.searchableFields = searchableFields

        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(sr)
        this.page = page
        this.rows = rows

        if (sr.query['order_by'] != null) {
            if (searchableFields[sr.query['order_by']] == null)
                throw new BadRequestException()
            this.orderBy = sr.query['order_by']
            this.order = sr.query['order_by_direction'] != null && sr.query['order_by_direction'].toUpperCase() === Order.DESC ? Order.DESC : Order.ASC
        }

        this.searchOr = sr.query['search_or'] != null && sr.query['search_or'] === '1'
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
