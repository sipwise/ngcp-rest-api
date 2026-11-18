import {ApiPropertyOptional} from '@nestjs/swagger'

import {FileshareResponseDto} from './fileshare-response.dto'

import {DateTimeField} from '~/decorators/date-time-field.decorator'

export class FileshareSearchDto implements FileshareResponseDto {
    @ApiPropertyOptional({description: 'Id of the file'})
        id: string
    @ApiPropertyOptional({description: 'File name'})
        name: string
    @ApiPropertyOptional()
        mime_type: string
    @ApiPropertyOptional({description: 'Time to live in seconds'})
        ttl: number
    @ApiPropertyOptional({description: 'Size in bytes'})
        size: number
    @DateTimeField()
    @ApiPropertyOptional({description: 'Upload time'})
        created_at: Date
    @DateTimeField()
    @ApiPropertyOptional({description: 'Expiry time, the file is deleted afterwards'})
        expires_at: Date
    @ApiPropertyOptional({description: 'Subscriber who uploaded the file'})
        subscriber_id?: number
    @ApiPropertyOptional({description: 'Reseller of the uploader'})
        reseller_id?: number
}
