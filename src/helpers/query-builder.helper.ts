import { SelectQueryBuilder } from 'typeorm';

export interface SearchLogic {
    joins?: {
        alias: string,
        property: string
    }[],
    where: {},
    rows?: number,
    page?: number
}

export async function configureQueryBuilder(queryBuilder: SelectQueryBuilder<any>, requestParams: string[], searchLogic: SearchLogic) {
    for (const joinCondition in searchLogic.joins) {
        let joinTable = searchLogic.joins[joinCondition].alias
        let joinColumn = searchLogic.joins[joinCondition].property
        if (joinTable != undefined && joinColumn != undefined) {
            queryBuilder.leftJoinAndSelect(`${queryBuilder.alias}.${joinColumn}`, `${joinColumn}`)
            if (requestParams[joinColumn] != null) {
                queryBuilder.where(`${joinTable}.${joinColumn} = :${joinColumn}`, { [`${joinColumn}`]: requestParams[joinColumn] })
            }
        }
    }
    for (const paramIndex in searchLogic.where) {
        let paramName = searchLogic.where[paramIndex]
        //if a JOIN has happened based on this request parameter, skip it for the WHERE clause
        if (searchLogic.joins?.some(j => j.property === paramName)) {
            continue
        }
        if (requestParams[paramName] != null)
            queryBuilder = (requestParams["search_or"] === "1") ?
                queryBuilder.orWhere(`${queryBuilder.alias}.${paramName} = :${paramName}`, { [`${paramName}`] : requestParams[paramName] }) :
                queryBuilder.andWhere(`${queryBuilder.alias}.${paramName} = :${paramName}`, { [`${paramName}`] : requestParams[paramName] })
    }
    if (searchLogic.rows != null) {
        queryBuilder.limit(searchLogic.rows)
    }
    if (searchLogic.rows != null && searchLogic.page != null) {
        queryBuilder.offset(searchLogic.rows * (searchLogic.page - 1))
    }
    queryBuilder.andWhere("1 = 1")
}
