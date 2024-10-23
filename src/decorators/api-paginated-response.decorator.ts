import {applyDecorators, Type} from '@nestjs/common'
import {PaginatedDto} from '../dto/paginated.dto'
import {ApiExtraModels, ApiOkResponse, getSchemaPath} from '@nestjs/swagger'

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