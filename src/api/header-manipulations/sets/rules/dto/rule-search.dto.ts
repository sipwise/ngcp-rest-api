import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'

export class HeaderManipulationRuleSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        set_id: number = undefined
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiPropertyOptional()
        stopper: boolean = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        direction: HeaderRuleDirection = undefined
    @ApiPropertyOptional()
        priority: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'headerRule.id',
        subscriber_id: 'headerRuleSet.subscriber_id',
    }
}
