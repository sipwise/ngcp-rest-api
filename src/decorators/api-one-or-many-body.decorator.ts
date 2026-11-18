import {Type, applyDecorators} from '@nestjs/common'
import {ApiBody, ApiExtraModels, SchemaObject, getSchemaPath} from '@nestjs/swagger'

// the body of ParseOneOrManyPipe: one item or an array of items
export function oneOrManySchema(model: Type<unknown>): SchemaObject {
    const item = {$ref: getSchemaPath(model)}
    return {oneOf: [item, {type: 'array', items: item}]}
}

export function ApiOneOrManyBody(model: Type<unknown>): MethodDecorator {
    return applyDecorators(
        ApiExtraModels(model),
        ApiBody({required: true, schema: oneOrManySchema(model)}),
    )
}
