import {Type, applyDecorators} from '@nestjs/common'
import {ApiExtraModels, ApiOperation, getSchemaPath} from '@nestjs/swagger'

export function ApiJsonOrCsvBody(model: Type<unknown>, csvExample: string): MethodDecorator {
    return applyDecorators(
        ApiExtraModels(model),
        ApiOperation({
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {type: 'array', items: {$ref: getSchemaPath(model)}},
                    },
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            required: ['file'],
                            properties: {
                                file: {
                                    type: 'string',
                                    format: 'binary',
                                    description: 'CSV file (`text/csv`), e.g.:\n\n```\n' + csvExample + '\n```',
                                },
                            },
                        },
                        encoding: {
                            file: {contentType: 'text/csv'},
                        },
                    },
                },
            },
        }),
    )
}