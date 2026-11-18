import {Type,applyDecorators} from '@nestjs/common'
import {ApiBody, ApiExtraModels, getSchemaPath} from '@nestjs/swagger'

import {PatchDto} from '~/dto/patch.dto'

// the body of ParseIdDictionary (bulk PUT and PATCH): the items keyed by id, for PATCH their JSON Patch documents
// TODO: This needs to be any, but we need to find a way to make it a generic. Maybe never type?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ApiPutBody = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    const item = {$ref: getSchemaPath(model)}
    return applyDecorators(
        ApiExtraModels(model),
        ApiBody({
            schema: {
                type: 'object',
                description: 'Items keyed by id',
                additionalProperties: model == PatchDto ? {type: 'array', items: item} : item,
            },
        }),
    )
}
