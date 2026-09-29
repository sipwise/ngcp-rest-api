import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class RewriteRuleSetSearchDto {
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        description: number = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'rewriteRuleSet.id',
    }
}
