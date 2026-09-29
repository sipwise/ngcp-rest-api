import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleSearchDto {
    @ApiPropertyOptional()
        set_id: number = undefined
    @ApiPropertyOptional()
        description: string = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        match_pattern: string = undefined
    @ApiPropertyOptional()
        replace_pattern: string = undefined
    @ApiPropertyOptional()
        direction: RewriteRuleDirection = undefined
    @ApiPropertyOptional()
        field: RewriteRuleField = undefined
    @ApiPropertyOptional()
        priority: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'rewriteRule.id',
        reseller_id: 'rewriteRuleSet.reseller_id',
    }
}
