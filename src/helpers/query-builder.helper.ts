import {BaseEntity, SelectQueryBuilder} from 'typeorm'
import {BadRequestException} from '@nestjs/common'

export interface SearchLogic {
    joins?: {
        alias: string,
        property: string
    }[],
    searchableFields: string[],
    rows?: number,
    page?: number
}

enum Order {
    ASC = 'ASC',
    DESC = 'DESC'
}

export async function configureQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: string[], searchLogic: SearchLogic) {
    await addJoinFilterToQueryBuilder(qb, params, searchLogic)
    await addSearchFilterToQueryBuilder(qb, params, searchLogic)
    await addOrderByToQueryBuilder(qb, params, searchLogic)
    await addPaginationToQueryBuilder(qb, searchLogic)
    qb.andWhere('1 = 1')
}

async function addJoinFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: string[], searchLogic: SearchLogic) {
    for (const joinCondition in searchLogic.joins) {
        const joinTable = searchLogic.joins[joinCondition].alias
        const joinColumn = searchLogic.joins[joinCondition].property
        if (joinTable != undefined && joinColumn != undefined) {
            qb.leftJoinAndSelect(`${qb.alias}.${joinColumn}`, `${joinColumn}`)
            if (params[joinColumn] != null) {
                qb.where(`${joinTable}.${joinColumn} = :${joinColumn}`, {[`${joinColumn}`]: params[joinColumn]})
            }
        }
    }
}

async function addSearchFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: string[], searchLogic: SearchLogic) {
    for (const property of searchLogic.searchableFields) {
        //if a JOIN has happened based on this request parameter, skip it for the WHERE clause
        if (searchLogic.joins?.some(j => j.property === property)) {
            continue
        }
        if (params[property] != null) {
            let value: string = params[property]

            const whereComparator = value.includes('*') ? 'like' : '='
            value = value.replace(/\*/g, '%')

            if (params['search_or'] === '1') {
                qb.orWhere(`${qb.alias}.${property} ${whereComparator} :${property}`, {[`${property}`]: value})
            } else {
                qb.andWhere(`${qb.alias}.${property} ${whereComparator} :${property}`, {[`${property}`]: value})
            }
        }
    }
}

async function addOrderByToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: string[], searchLogic: SearchLogic) {
    if (params['order_by'] != null) {
        if (searchLogic.searchableFields[params['order_by']] == null)
            throw new BadRequestException()
        // set default order to ASC
        const order = params['order_by_direction'] != null && params['order_by_direction'].toUpperCase() === Order.DESC ? Order.DESC : Order.ASC
        qb.addOrderBy(params['order_by'], order)
    }
}

async function addPaginationToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic) {
    if (searchLogic.rows != null) {
        qb.limit(searchLogic.rows)
    }
    if (searchLogic.rows != null && searchLogic.page != null) {
        qb.offset(searchLogic.rows * (searchLogic.page - 1))
    }
}
