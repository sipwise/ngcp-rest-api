import {applyDecorators, Type} from '@nestjs/common'
import {CreateResponseDto} from '../dto/create-response.dto'
import {ApiExtraModels, ApiCreatedResponse as ApiSwaggerCreatedResponse, getSchemaPath} from '@nestjs/swagger'

export const ApiCreatedResponse = <TModel extends Type<any>>(
    model: TModel,
) => {
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