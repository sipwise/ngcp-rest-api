import {ApiPropertyOptional} from '@nestjs/swagger'

import {FileshareResponseDto} from './fileshare-response.dto'

export class FileshareSearchDto implements FileshareResponseDto {
    @ApiPropertyOptional()
        id: string = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        mime_type: string = undefined
    @ApiPropertyOptional()
        ttl: number = undefined
    @ApiPropertyOptional()
        size: number = undefined
    @ApiPropertyOptional()
        created_at: Date = undefined
    @ApiPropertyOptional()
        expires_at: Date = undefined
    @ApiPropertyOptional()
        subscriber_id?: number = undefined
    @ApiPropertyOptional()
        reseller_id?: number = undefined
}
