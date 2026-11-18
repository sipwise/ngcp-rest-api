import {Type, applyDecorators} from '@nestjs/common'
import {ApiExtraModels, ApiOperation} from '@nestjs/swagger'

import {oneOrManySchema} from '~/decorators/api-one-or-many-body.decorator'

export function ApiJsonOrCsvBody(model: Type<unknown>, csvExample: string): MethodDecorator {
    return applyDecorators(
        ApiExtraModels(model),
        ApiOperation({
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: oneOrManySchema(model),
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
                                    example: csvExample,
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