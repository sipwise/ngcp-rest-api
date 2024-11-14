import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleSearchDto {
    set_id: number = undefined
    description: string = undefined
    enabled: boolean = undefined
    match_pattern: string = undefined
    replace_pattern: string = undefined
    direction: RewriteRuleDirection = undefined
    field: RewriteRuleField = undefined
    priority: number = undefined
    _alias = {
        reseller_id: 'rewriteRuleSet.reseller_id',
    }
}
