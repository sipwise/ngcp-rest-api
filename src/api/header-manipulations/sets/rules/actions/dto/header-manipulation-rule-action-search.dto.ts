export class HeaderManipulationRuleActionSearchDto {
    action_type: string = undefined
    enabled: boolean = undefined
    header_part: string = undefined
    header: string = undefined
    id: number = undefined
    priority: number = undefined
    rule_id: number = undefined
    rwr_dp_id: number = undefined
    rwr_set_id: number = undefined
    value_part: string = undefined
    value: string = undefined
    subscriber_id: number = undefined
    _alias = {
        id: 'headerRuleAction.id',
        action_type: 'headerRuleAction.action_type',
        enabled: 'headerRuleAction.enabled',
        header_part: 'headerRuleAction.header_part',
        header: 'headerRuleAction.header',
        priority: 'headerRuleAction.priority',
        rule_id: 'headerRuleAction.rule_id',
        rwr_dp_id: 'headerRuleAction.rwr_dp_id',
        rwr_set_id: 'headerRuleAction.rwr_set_id',
        value_part: 'headerRuleAction.value_part',
        value: 'headerRuleAction.value',
        subscriber_id: 'headerRuleSet.subscriber_id',
    }
}
