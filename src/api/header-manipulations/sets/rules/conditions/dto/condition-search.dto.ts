import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleConditionSearchDto {
    @ApiPropertyOptional()
        rule_id: number
    @ApiPropertyOptional()
        match_name: string
    @ApiPropertyOptional()
        expression_negation: boolean
    @ApiPropertyOptional()
        rwr_set_id: number
    @ApiPropertyOptional()
        rwr_dp_id: number
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'headerRuleCondition.id',
            subscriber_id: 'headerRuleSet.subscriber_id',
        }
}
