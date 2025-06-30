import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'

export class HeaderManipulationRuleSearchDto {
    name: string = undefined
    set_id: number = undefined
    subscriber_id: number = undefined
    stopper: boolean = undefined
    enabled: boolean = undefined
    direction: HeaderRuleDirection = undefined
    priority: number = undefined
    _alias = {
        id: 'headerRule.id',
        subscriber_id: 'headerRuleSet.subscriber_id',
    }
}
