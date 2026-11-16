import {Type,applyDecorators} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, getSchemaPath} from '@nestjs/swagger'

import {ResponseModel} from '~/decorators/response-model.decorator'
import {PaginatedDto} from '~/dto/paginated.dto'

// TODO: This needs to be any, but we need to find a way to make it a generic. Maybe never type?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ApiPaginatedResponse = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    return applyDecorators(
        ResponseModel(model),
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