import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleActionSearchDto {
    @ApiPropertyOptional({description: 'Change made to the header'})
        action_type: string
    @ApiPropertyOptional({description: 'Action is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'Part of the header the action changes'})
        header_part: string
    @ApiPropertyOptional({description: 'SIP header the action changes'})
        header: string
    @ApiPropertyOptional({description: 'Id of the header rule action'})
        id: number
    @ApiPropertyOptional({description: 'Priority of the action; lower values are applied first'})
        priority: number
    @ApiPropertyOptional({description: 'Header rule of the action'})
        rule_id: number
    @ApiPropertyOptional({description: 'Internal dialplan id of the applied rewrite rules'})
        rwr_dp_id: number
    @ApiPropertyOptional({description: 'Rewrite rule set applied to the value; null = none'})
        rwr_set_id: number
    @ApiPropertyOptional({description: 'Part of the value that is used'})
        value_part: string
    @ApiPropertyOptional({description: 'Value used by the action'})
        value: string
    @ApiPropertyOptional({description: 'Subscriber of the header rule set'})
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
