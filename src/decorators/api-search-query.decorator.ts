import {Type} from '@nestjs/common'
import {ApiPropertyOptions, ApiQuery, ApiQueryOptions, DECORATORS} from '@nestjs/swagger'

import {SearchLogic} from '~/helpers/search-logic.helper'

export const SEARCH_QUERY_ORDER_KEY = 'x-search-order'

type SearchQueryParam = ApiQueryOptions & {name: string}

export const ApiSearchQuery = (...types: Type<any>[]): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
        let order = 0
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

            for (const param of params) {
                const options = {...param, [SEARCH_QUERY_ORDER_KEY]: order++}
                ApiQuery(options)(target, propertyKey, descriptor)
            }
        }
        return descriptor
    }
}
