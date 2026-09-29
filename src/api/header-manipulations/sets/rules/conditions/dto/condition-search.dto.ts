import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleConditionSearchDto {
    @ApiPropertyOptional()
        rule_id: number = undefined
    @ApiPropertyOptional()
        match_name: string = undefined
    @ApiPropertyOptional()
        expression_negation: boolean = undefined
    @ApiPropertyOptional()
        rwr_set_id: number = undefined
    @ApiPropertyOptional()
        rwr_dp_id: number = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'headerRuleCondition.id',
        subscriber_id: 'headerRuleSet.subscriber_id',
    }
}
