export class PeeringInboundRuleSearchDto {
    name: string = undefined
    group_id: number = undefined
    field: string = undefined
    pattern: string = undefined
    priority: number = undefined
    reject_code: number = undefined
    reject_reason: string = undefined
    enabled: boolean = undefined
    _alias = {
        id: 'rule.id',
    }
}
