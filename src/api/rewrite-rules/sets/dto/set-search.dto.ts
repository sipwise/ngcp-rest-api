import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class RewriteRuleSetSearchDto {
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        description: number
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'rewriteRuleSet.id',
        }
}
