import {BaseEntity, SelectQueryBuilder} from 'typeorm'
import {SearchLogic} from './search-logic.helper'
import {ParamsDictionary} from '../interfaces/service-request.interface'
import {BadRequestException} from '@nestjs/common'
import {reservedQueryParams} from '../config/constants.config'

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
    const allow_unknown_params = 'allow_unknown_params' in params
                                    && JSON.parse(params['allow_unknown_params'])
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
        if (propertyAlias.indexOf('.') != -1) {
            [qb_alias, alias] = propertyAlias.split('.')
        }

        const searchValue = params[searchField]
        const whereComparator = searchValue.includes('*') ? 'like' : '='
        const value = searchValue.replace(/\*/g, '%')

        // TODO: value should be number | string | boolean and add type casting
        if (searchLogic.searchOr) {
            qb.orWhere(`${qb_alias}.${alias} ${whereComparator} :${propertyAlias}`, {[`${propertyAlias}`]: value})
        } else {
            qb.andWhere(`${qb_alias}.${alias} ${whereComparator} :${propertyAlias}`, {[`${propertyAlias}`]: value})
        }
    })
}

export function addOrderByToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, params: ParamsDictionary, searchLogic: SearchLogic) {
    if (searchLogic.orderBy != null) {
        qb.addOrderBy(searchLogic.orderBy, searchLogic.orderByDirection)
    }
}

export function addPaginationToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic) {
    qb.limit(searchLogic.rows)
    qb.offset(searchLogic.rows * (searchLogic.page - 1))
}
