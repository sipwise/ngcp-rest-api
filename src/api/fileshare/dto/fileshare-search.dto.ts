import {ApiPropertyOptional} from '@nestjs/swagger'

import {FileshareResponseDto} from './fileshare-response.dto'

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
    @ApiPropertyOptional()
        created_at: Date
    @ApiPropertyOptional()
        expires_at: Date
    @ApiPropertyOptional()
        subscriber_id?: number
    @ApiPropertyOptional()
        reseller_id?: number
}
