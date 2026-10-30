import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleSearchDto {
    @ApiPropertyOptional()
        set_id: number
    @ApiPropertyOptional()
        description: string
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        match_pattern: string
    @ApiPropertyOptional()
        replace_pattern: string
    @ApiPropertyOptional()
        direction: RewriteRuleDirection
    @ApiPropertyOptional()
        field: RewriteRuleField
    @ApiPropertyOptional()
        priority: number
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        reseller_id: number
    @ApiHideProperty()
        _alias = {
            id: 'rewriteRule.id',
            reseller_id: 'rewriteRuleSet.reseller_id',
        }
}
