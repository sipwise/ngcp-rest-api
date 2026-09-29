import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleActionSearchDto {
    @ApiPropertyOptional()
        action_type: string = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        header_part: string = undefined
    @ApiPropertyOptional()
        header: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        priority: number = undefined
    @ApiPropertyOptional()
        rule_id: number = undefined
    @ApiPropertyOptional()
        rwr_dp_id: number = undefined
    @ApiPropertyOptional()
        rwr_set_id: number = undefined
    @ApiPropertyOptional()
        value_part: string = undefined
    @ApiPropertyOptional()
        value: string = undefined
    @ApiPropertyOptional()
        subscriber_id: number = undefined
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
