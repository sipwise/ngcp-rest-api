import {ApiPropertyOptional} from '@nestjs/swagger'

import {FileshareResponseDto} from './fileshare-response.dto'

import {DateTimeField} from '~/decorators/date-time-field.decorator'

export class FileshareSearchDto implements FileshareResponseDto {
    @ApiPropertyOptional()
        id: string
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        mime_type: string
    @ApiPropertyOptional()
        ttl: number
    @ApiPropertyOptional()
        size: number
    @DateTimeField()
    @ApiPropertyOptional()
        created_at: Date
    @DateTimeField()
    @ApiPropertyOptional()
        expires_at: Date
    @ApiPropertyOptional()
        subscriber_id?: number
    @ApiPropertyOptional()
        reseller_id?: number
}
