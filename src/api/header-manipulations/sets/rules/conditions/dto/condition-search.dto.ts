import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleConditionSearchDto {
    @ApiPropertyOptional({description: 'Header rule of the condition'})
        rule_id: number
    @ApiPropertyOptional({description: 'Name of the header, preference or AVP matched'})
        match_name: string
    @ApiPropertyOptional({description: 'Result of the comparison is negated'})
        expression_negation: boolean
    @ApiPropertyOptional({description: 'Rewrite rule set applied to the source value; null = none'})
        rwr_set_id: number
    @ApiPropertyOptional({description: 'Internal dialplan id of the applied rewrite rules'})
        rwr_dp_id: number
    @ApiPropertyOptional({description: 'Condition is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'Subscriber of the header rule set'})
        subscriber_id: number
    @ApiPropertyOptional({description: 'Id of the header rule condition'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'headerRuleCondition.id',
            subscriber_id: 'headerRuleSet.subscriber_id',
        }
}
