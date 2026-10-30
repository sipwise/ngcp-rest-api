import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleActionSearchDto {
    @ApiPropertyOptional()
        action_type: string
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        header_part: string
    @ApiPropertyOptional()
        header: string
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        priority: number
    @ApiPropertyOptional()
        rule_id: number
    @ApiPropertyOptional()
        rwr_dp_id: number
    @ApiPropertyOptional()
        rwr_set_id: number
    @ApiPropertyOptional()
        value_part: string
    @ApiPropertyOptional()
        value: string
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiHideProperty()
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
