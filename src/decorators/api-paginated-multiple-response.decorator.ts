/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {Type, applyDecorators} from '@nestjs/common'
import {ApiExtraModels,ApiOkResponse as ApiSwaggerOkResponse, getSchemaPath} from '@nestjs/swagger'

import {PaginatedDto} from '~/dto/paginated.dto'

interface ContentType {
  type: string;
  data: any
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ApiPaginatedMultipleResponse = <TModel extends Type<any>>(
    options: {
    description: string;
    contents: ContentType[];
  },
): MethodDecorator => {
    const {description, contents} = options

    const contentSchemas = contents.reduce((acc, content) => {
        const {type, data} = content

        switch (type) {
            case 'text/csv':
                acc[type] = {
                    schema: {
                        type: 'string',
                        example: data.example,
                    },
                }
                break

            case 'application/json':
                acc[type] = {
                    schema: {
                        allOf: [
                            {$ref: getSchemaPath(PaginatedDto)},
                            {
                                properties: {
                                    data: {
                                        type: 'array',
                                        items: {$ref: getSchemaPath(data.item)},
                                    },
                                },
                            },
                        ],
                    },
                }
                break
            default:
                throw new Error(`Unsupported content type: ${type}`)
        }

        return acc
    }, {})

    return applyDecorators(
        ApiExtraModels(...contents.map(content => content.data)),
        ApiSwaggerOkResponse({
            description,
            content: contentSchemas,
        }),
    )
}
