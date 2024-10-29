import {Type,applyDecorators} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, getSchemaPath} from '@nestjs/swagger'

import {PaginatedDto} from '~/dto/paginated.dto'

export const ApiPaginatedResponse = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    return applyDecorators(
        ApiExtraModels(PaginatedDto, model),
        ApiOkResponse({
            schema: {
                title: `PaginatedResponseOf${model.name}`,
                allOf: [
                    {$ref: getSchemaPath(PaginatedDto)},
                    {
                        properties: {
                            data: {
                                type: 'array',
                                items: {$ref: getSchemaPath(model)},
                            },
                        },
                    },
                ],
            },
        }),
    )
}