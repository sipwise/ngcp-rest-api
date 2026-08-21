export class PeeringRuleSearchDto {
    name: string = undefined
    group_id: number = undefined
    callee_prefix: string = undefined
    callee_pattern: string = undefined
    caller_pattern: string = undefined
    description: string = undefined
    enabled: boolean = undefined
    stopper: boolean = undefined
    _alias = {
        id: 'rule.id',
    }
}
