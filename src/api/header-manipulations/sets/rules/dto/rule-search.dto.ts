import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'

export class HeaderManipulationRuleSearchDto {
    @ApiPropertyOptional({description: 'Name of the rule'})
        name: string
    @ApiPropertyOptional({description: 'Header rule set of the rule'})
        set_id: number
    @ApiPropertyOptional({description: 'Subscriber of the header rule set; creates a subscriber set when given instead of set_id'})
        subscriber_id: number
    @ApiPropertyOptional({description: 'No further rules are processed when this rule matches'})
        stopper: boolean
    @ApiPropertyOptional({description: 'Rule is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'Call leg and direction the rule applies to'})
        direction: HeaderRuleDirection
    @ApiPropertyOptional({description: 'Priority of the rule; lower values are processed first'})
        priority: number
    @ApiPropertyOptional({description: 'Id of the header rule'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'headerRule.id',
            subscriber_id: 'headerRuleSet.subscriber_id',
        }
}
