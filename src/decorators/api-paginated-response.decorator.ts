import {Type,applyDecorators} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ReferenceObject, SchemaObject, getSchemaPath} from '@nestjs/swagger'

import {ResponseModel} from '~/decorators/response-model.decorator'

export function paginatedSchema(items: SchemaObject | ReferenceObject): SchemaObject {
    return {
        type: 'object',
        required: ['total_count', 'data'],
        properties: {
            total_count: {type: 'integer', description: 'Number of items matching the request, on all pages'},
            data: {type: 'array', items, description: 'The items of the page'},
        },
    }
}

// TODO: This needs to be any, but we need to find a way to make it a generic. Maybe never type?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ApiPaginatedResponse = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    return applyDecorators(
        ResponseModel(model),
        ApiExtraModels(model),
        ApiOkResponse({
            schema: paginatedSchema({$ref: getSchemaPath(model)}),
        }),
    )
}
