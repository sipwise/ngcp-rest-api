import {Type} from '@nestjs/common'
import {ApiPropertyOptions, ApiQuery, ApiQueryOptions, DECORATORS} from '@nestjs/swagger'

import {SearchLogic} from '~/helpers/search-logic.helper'

export const SEARCH_QUERY_ORDER_KEY = 'x-search-order'

export type SearchQueryParam = ApiPropertyOptions & {name: string, [SEARCH_QUERY_ORDER_KEY]: number}

/**
 * Query parameters of the `@ApiPropertyOptional` fields of the types: SearchLogic's in their order, the others
 * by name; the order key keeps that order in the document (sortSearchQueryParameters)
 */
export function searchQueryParams(...types: Type<unknown>[]): SearchQueryParam[] {
    const result: SearchQueryParam[] = []
    for (const type of types) {
        const prototype = type.prototype as object
        const propertyKeys =
            (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, prototype) ?? []) as string[]
        const params: SearchQueryParam[] = []

        for (const key of propertyKeys) {
            if (key.charAt(0) !== ':')
                continue
            const propertyName = key.slice(1)
            const metadata =
                (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, prototype, propertyName) ?? {}) as ApiPropertyOptions
            params.push({
                ...metadata,
                name: metadata.name ?? propertyName,
                required: false,
            } as SearchQueryParam)
        }

        if (type !== SearchLogic)
            params.sort((a, b) => a.name.localeCompare(b.name))

        for (const param of params)
            result.push({...param, [SEARCH_QUERY_ORDER_KEY]: result.length})
    }
    return result
}

export const ApiSearchQuery = (...types: Type<unknown>[]): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
        for (const param of searchQueryParams(...types))
            ApiQuery(param as ApiQueryOptions)(target, propertyKey, descriptor)
        return descriptor
    }
}
