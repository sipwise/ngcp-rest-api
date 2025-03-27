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
    const allowUnknownParams = 'allow_unknown_params' in params && JSON.parse(params['allow_unknown_params'].toString())

    Object.keys(params).forEach((searchField: string) => {
        if (reservedQueryParams.includes(searchField))
            return

        const paramExists = searchLogic.searchableFields.includes(searchField)
        if (!allowUnknownParams && !paramExists)
            throw new BadRequestException(`Unknown query parameter: ${searchField}`)

        if (!paramExists)
            return

        const propertyAlias = searchLogic.aliases?.[searchField] ?? searchField
        const [qbAlias, alias] = typeof propertyAlias === 'string' && propertyAlias.includes('.')
            ? propertyAlias.split('.')
            : [qb.alias, propertyAlias]

        const searchValue = params[searchField].toString()
        const values = searchValue.split(',').map(val => val.trim())

        const complexSearch = typeof propertyAlias === 'object' && propertyAlias['format']
        const conditions: string[] = []
        const parameters: Record<string, unknown> = {}

        if (complexSearch) {
            const field = propertyAlias['field']
            const comparator = propertyAlias['comparator']
            const transform = propertyAlias['transform']

            values.forEach((value, index) => {
                const paramKey = `${field}_${index}`
                const formattedValue = complexSearch([value.replace(/\*/g, '%')])

                if (transform) {
                    conditions.push(`${transform}(${qbAlias}.${field}) ${comparator} ${transform}(:${paramKey})`)
                } else {
                    conditions.push(`${qbAlias}.${field} ${comparator} :${paramKey}`)
                }
                parameters[paramKey] = formattedValue
            })
        } else {
            const exactValues = values.filter(value => !value.includes('*'))
            const likeValues = values.filter(value => value.includes('*'))

            if (exactValues.length > 0) {
                conditions.push(`${qbAlias}.${alias} IN (:...${alias}_in)`)
                parameters[`${alias}_in`] = exactValues
            }

            likeValues.forEach((value, index) => {
                const paramKey = `${alias}_like_${index}`
                conditions.push(`${qbAlias}.${alias} LIKE :${paramKey}`)
                parameters[paramKey] = value.replace(/\*/g, '%')
            })
        }

        const whereClause = `(${conditions.join(' OR ')})`
        if (searchLogic.searchOr) {
            qb.orWhere(whereClause, parameters)
        } else {
            qb.andWhere(whereClause, parameters)
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
