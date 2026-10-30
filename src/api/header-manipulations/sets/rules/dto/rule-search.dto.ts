import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'

export class HeaderManipulationRuleSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        set_id: number
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiPropertyOptional()
        stopper: boolean
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        direction: HeaderRuleDirection
    @ApiPropertyOptional()
        priority: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'headerRule.id',
            subscriber_id: 'headerRuleSet.subscriber_id',
        }
}
