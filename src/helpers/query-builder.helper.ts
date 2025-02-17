import {BadRequestException} from '@nestjs/common'
import {BaseEntity, SelectQueryBuilder} from 'typeorm'

import {SearchLogic} from './search-logic.helper'

import {reservedQueryParams} from '~/config/constants.config'
import {QueriesDictionary} from '~/interfaces/service-request.interface'

export function configureQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: QueriesDictionary, searchLogic: SearchLogic): void {
    addJoinFilterToQueryBuilder(qb, params, searchLogic)
    addSearchFilterToQueryBuilder(qb, params, searchLogic)
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
                qb.where(`${joinTable}.${joinColumn} = :${joinColumn}`, {[`${joinColumn}`]: params[joinColumn]})
            }
        }
    }
}

function addSearchFilterToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: QueriesDictionary, searchLogic: SearchLogic): void {
    const allow_unknown_params = 'allow_unknown_params' in params
                                    && JSON.parse(params['allow_unknown_params'].toString())
    Object.keys(params).forEach((searchField: string) => {
        if (reservedQueryParams.indexOf(searchField) >= 0)
            return

        const param_exists = searchLogic.searchableFields.indexOf(searchField) >= 0
        if (!allow_unknown_params && !param_exists)
            throw new BadRequestException(`unknown query parameter: ${searchField}`)
        if (!param_exists)
            return

        const propertyAlias = searchLogic.aliases && searchLogic.aliases[searchField]
            ? searchLogic.aliases[searchField]
            : searchField

        let qb_alias = qb.alias
        let alias    = propertyAlias
        if (typeof propertyAlias === 'string' && propertyAlias.indexOf('.') != -1) {
            [qb_alias, alias] = propertyAlias.split('.')
        }

        const searchValue = params[searchField].toString()
        const whereComparator = searchValue.includes('*') ? 'like' : '='
        const value = searchValue.replace(/\*/g, '%')

        const complexSearch: (args: string[]) => string = typeof propertyAlias === 'object' && propertyAlias['format']

        let whereBy: string
        let whereValue: object | null
        if (complexSearch) {
            const field = propertyAlias['field']
            const comparator = propertyAlias['comparator']
            const transform = propertyAlias['transform']
            const formatValue = complexSearch([value])
            if (transform) {
                whereBy = `${transform}(${qb_alias}.${field}) ${comparator} ${transform}('${formatValue}')`
            } else {
                whereBy = `${qb_alias}.${alias} ${comparator} :${field}`
                whereValue = {[`${field}`]: formatValue}
            }
        } else {
            whereBy = `${qb_alias}.${alias} ${whereComparator} :${propertyAlias}`
            whereValue = {[`${propertyAlias}`]: value}
        }

        // TODO: value should be number | string | boolean and add type casting
        if (searchLogic.searchOr) {
            qb.orWhere(whereBy, whereValue)
        } else {
            qb.andWhere(whereBy, whereValue)
        }
    })
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
