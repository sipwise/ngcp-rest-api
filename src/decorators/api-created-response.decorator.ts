import {Type,applyDecorators} from '@nestjs/common'
import {ApiCreatedResponse as ApiSwaggerCreatedResponse,ApiExtraModels, getSchemaPath} from '@nestjs/swagger'

import {CreateResponseDto} from '~/dto/create-response.dto'

export const ApiCreatedResponse = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    return applyDecorators(
        ApiExtraModels(CreateResponseDto, model),
        ApiSwaggerCreatedResponse({
            schema: {
                title: `CreatedResponseOf${model.name}`,
                allOf: [
                    {$ref: getSchemaPath(CreateResponseDto)},
                    {
                        properties: {
                            data: {
                                type: 'array',
                                items: {$ref: getSchemaPath(model)},
                            },
                            links: {
                                type: 'array',
                            },
                            ids: {
                                type: 'array',
                            },
                        },
                    },
                ],
            },
        }),
    )
}