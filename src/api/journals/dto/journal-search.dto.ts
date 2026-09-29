import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class JournalSearchDto {
    @ApiPropertyOptional()
        content?: string | Buffer = undefined
    @ApiPropertyOptional()
        content_format: string = undefined
    @ApiPropertyOptional()
        operation: string = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        resource_id: number = undefined
    @ApiPropertyOptional()
        resource_name: string = undefined
    @ApiPropertyOptional()
        role: string | null = undefined
    @ApiPropertyOptional()
        timestamp: number = undefined
    @ApiPropertyOptional()
        tx_id: string = undefined
    @ApiPropertyOptional()
        username: string = undefined
    @ApiPropertyOptional()
        user_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'journal.id',
    }
}
