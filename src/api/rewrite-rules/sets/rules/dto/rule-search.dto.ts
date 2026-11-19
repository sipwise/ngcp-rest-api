import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleSearchDto {
    @ApiPropertyOptional({description: 'Rewrite rule set of the rule'})
        set_id: number
    @ApiPropertyOptional({description: 'Description of the rule'})
        description: string
    @ApiPropertyOptional({description: 'Rule is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'PCRE regex the number is matched against'})
        match_pattern: string
    @ApiPropertyOptional({description: 'Replacement for the matched number, may use the regex groups (`\\1`)'})
        replace_pattern: string
    @ApiPropertyOptional({description: 'Direction the rule applies to: `in` inbound, `out` outbound, `lnp` number portability'})
        direction: RewriteRuleDirection
    @ApiPropertyOptional({description: 'Number the rule rewrites: `caller` or `callee`'})
        field: RewriteRuleField
    @ApiPropertyOptional({description: 'Priority of the rule, unique within the set, direction and field; lower values are applied first'})
        priority: number
    @ApiPropertyOptional({description: 'Id of the rewrite rule'})
        id: number
    @ApiPropertyOptional({description: 'Reseller of the rewrite rule set'})
        reseller_id: number
    @ApiHideProperty()
        _alias = {
            id: 'rewriteRule.id',
            reseller_id: 'rewriteRuleSet.reseller_id',
        }
}
