import {Type,applyDecorators} from '@nestjs/common'
import {ApiCreatedResponse as ApiSwaggerCreatedResponse,ApiExtraModels, getSchemaPath} from '@nestjs/swagger'

// the answer of a POST, see transform.interceptor.ts: the created items in `data`, or by the `Prefer` header
// their `links` or `ids` instead; a bulk POST without `Prefer` answers 204
// TODO: This needs to be any, but we need to find a way to make it a generic. Maybe never type?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ApiCreatedResponse = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    const idType = Reflect.getMetadata('design:type', model.prototype, 'id') === String ? 'string' : 'integer'
    return applyDecorators(
        ApiExtraModels(model),
        ApiSwaggerCreatedResponse({
            description: 'Created. A bulk POST without `Prefer` answers 204 without a body.',
            schema: {
                type: 'object',
                required: ['total_count'],
                properties: {
                    total_count: {type: 'integer', description: 'Number of created items'},
                    data: {
                        type: 'array',
                        items: {$ref: getSchemaPath(model)},
                        description: 'The created items, with `Prefer: return=representation` or one item without `Prefer`',
                    },
                    links: {
                        type: 'array',
                        items: {type: 'string'},
                        description: 'Urls of the created items instead of `data`, with `Prefer: return=link`',
                    },
                    ids: {
                        type: 'array',
                        items: {type: idType},
                        description: 'Ids of the created items instead of `data`, with `Prefer: return=id`',
                    },
                },
            },
        }),
    )
}
