import {SetMetadata, Type} from '@nestjs/common'
import {DECORATORS} from '@nestjs/swagger'

const RESPONSE_MODEL_KEY = 'response:model'

/**
 * Response DTO class of a handler (set by ApiPaginatedResponse), read by expand and its nested filters
 */
export const ResponseModel = (model: Type<unknown>): MethodDecorator => SetMetadata(RESPONSE_MODEL_KEY, model)

interface SwaggerResponse {
    type?: unknown
}

/**
 * Class of a swagger `type` value: the class itself, a lazy `() => Class` or `[Class]`; undefined for
 * primitives and plain schemas
 */
export function modelClass(type: unknown): Type<unknown> | undefined {
    let value = type
    if (typeof value == 'function' && !value.prototype)
        value = (value as () => unknown)()
    if (Array.isArray(value))
        value = value[0]
    if (typeof value != 'function')
        return undefined
    const properties = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, value.prototype)
    return properties ? value as Type<unknown> : undefined
}

/**
 * Response DTO class of a GET handler: @ResponseModel() (ApiPaginatedResponse) first, else the `type` of its
 * 200 swagger response (ApiOkResponse)
 */
export function responseModel(handler: object): Type<unknown> | undefined {
    const model: Type<unknown> | undefined = Reflect.getMetadata(RESPONSE_MODEL_KEY, handler)
    if (model)
        return model
    const responses: Record<string, SwaggerResponse> = Reflect.getMetadata(DECORATORS.API_RESPONSE, handler) ?? {}
    return modelClass(responses['200']?.type)
}
