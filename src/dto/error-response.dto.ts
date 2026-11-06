import {ApiProperty, ApiPropertyOptional, ApiSchema} from '@nestjs/swagger'

import {ErrorEntry} from '~/helpers/errors.helper'

@ApiSchema({
    name: 'ErrorEntry',
    description: 'One failed check. Exactly one of pointer (request body) and parameter (path or query) is set.',
})
export class ErrorEntryDto implements ErrorEntry {
    @ApiPropertyOptional({
        description: 'RFC 6901 JSON Pointer into the request body (or the JSON Patch document), without "#".'
            + ' Indexes count from 0: bulk POST item, JSON Patch operation (/0/op), bulk DELETE id list,'
            + ' CSV data row without the header',
        example: '/1/status',
    })
        pointer?: string

    @ApiPropertyOptional({description: 'Name of the failed path or query parameter', example: 'order_by'})
        parameter?: string

    @ApiProperty({
        description: 'Machine-readable code of the check: validator name (isEnum, whitelistValidation),'
            + ' JSON Patch error (TEST_OPERATION_FAILED) or a specific code (RESELLER_ID_INVALID)',
        example: 'isEnum',
    })
        code: string

    @ApiProperty({
        description: 'Human-readable text, not to be parsed',
        example: 'status must be one of the following values: active, terminated',
    })
        message: string
}

@ApiSchema({name: 'ErrorResponse', description: 'The body of every error response'})
export class ErrorResponseDto {
    @ApiProperty({description: 'Id of the request in the server log', example: '725d5b49f5674d719db795cf2f81262e'})
        tx: string

    @ApiProperty({type: 'integer', description: 'HTTP status code', example: 422})
        statusCode: number

    @ApiProperty({description: 'Request path with the query string', example: '/api/v2/customercontacts'})
        path: string

    @ApiProperty({description: 'Request method', example: 'POST'})
        method: string

    @ApiProperty({description: 'HTTP status text', example: 'Unprocessable Entity'})
        error: string

    @ApiProperty({
        description: 'Machine-readable code of the error: VALIDATION_FAILED, INVALID_PARAMETER, INVALID_JSON,'
            + ' INVALID_JSON_PATCH, JSON_PATCH_CONFLICT, a specific code (RESELLER_ID_INVALID) or the status'
            + ' name (NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR)',
        example: 'VALIDATION_FAILED',
    })
        errorCode: string

    @ApiProperty({description: 'Human-readable text, not to be parsed', example: 'Validation failed'})
        message: string

    @ApiPropertyOptional({
        description: 'The single failures in request order, left out when there are none',
        type: [ErrorEntryDto],
    })
        errors?: ErrorEntryDto[]
}
