import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class JournalSearchDto {
    @ApiPropertyOptional()
        content?: string | Buffer
    @ApiPropertyOptional()
        content_format: string
    @ApiPropertyOptional()
        operation: string
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        resource_id: number
    @ApiPropertyOptional()
        resource_name: string
    @ApiPropertyOptional()
        role: string | null
    @ApiPropertyOptional()
        timestamp: number
    @ApiPropertyOptional()
        tx_id: string
    @ApiPropertyOptional()
        username: string
    @ApiPropertyOptional()
        user_id: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'journal.id',
        }
}
