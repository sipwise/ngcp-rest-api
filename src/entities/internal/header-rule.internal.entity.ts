
export enum HeaderRuleDirection {
    AInbound = 'a_inbound',
    BInbound = 'b_inbound',
    AOutbound = 'a_outbound',
    BOutbound = 'b_outbound',
    Local = 'local',
    Peer = 'peer',
    CfInbound = 'cf_inbound',
    CfOutbound = 'cf_outbound',
    Reply = 'reply',
}


export class HeaderRule {
    id: number
    setId?: number
    subscriberId?: number
    name: string
    description?: string
    priority: number
    direction: HeaderRuleDirection
    stopper: boolean
    enabled: boolean
}