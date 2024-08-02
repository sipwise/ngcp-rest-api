export class HeaderManipulationRuleConditionSearchDto {
    rule_id: number = undefined
    match_name: string = undefined
    expression_negation: boolean = undefined
    rwr_set_id: number = undefined
    rwr_dp_id: number = undefined
    enabled: boolean = undefined
    subscriber_id: number = undefined

    _alias = {
        subscriber_id: 'headerRuleSet.subscriber_id',
    }
}
