import {BaseEntity, SelectQueryBuilder} from 'typeorm'
import {SearchLogic} from './search-logic.helper'
import {ParamsDictionary} from '../interfaces/service-request.interface'

export function configureQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: ParamsDictionary, searchLogic: SearchLogic) {
    addJoinFilterToQueryBuilder(qb, params, searchLogic)
    addSearchFilterToQueryBuilder(qb, params, searchLogic)
    addOrderByToQueryBuilder(qb, params, searchLogic)
    addPaginationToQueryBuilder(qb, searchLogic)
    qb.andWhere('1 = 1')
}

function addJoinFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: ParamsDictionary, searchLogic: SearchLogic) {
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

function addSearchFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: ParamsDictionary, searchLogic: SearchLogic) {
    for (const property of searchLogic.searchableFields) {
        if (params[property] != null) {
            let value: string = params[property]

            const whereComparator = value.includes('*') ? 'like' : '='
            value = value.replace(/\*/g, '%')
            // TODO: value should be number | string | boolean and add type casting
            if (searchLogic.searchOr) {
                qb.orWhere(`${qb.alias}.${property} ${whereComparator} :${property}`, {[`${property}`]: value})
            } else {
                qb.andWhere(`${qb.alias}.${property} ${whereComparator} :${property}`, {[`${property}`]: value})
            }
        }
    }
}

export function addOrderByToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: ParamsDictionary, searchLogic: SearchLogic) {
    if (searchLogic.orderBy != null) {
        qb.addOrderBy(searchLogic.orderBy, searchLogic.order)
    }
}

export function addPaginationToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic) {
    qb.limit(searchLogic.rows)
    qb.offset(searchLogic.rows * (searchLogic.page - 1))
}
