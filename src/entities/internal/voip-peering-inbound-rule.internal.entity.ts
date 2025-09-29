export enum VoipPeeringInboundRuleField {
    FromUser = 'from_user',
    FromDomain = 'from_domain',
    FromUri = 'from_uri',
    ToUser = 'to_user',
    ToDomain = 'to_domain',
    ToUri = 'to_uri',
    RuriUser = 'ruri_user',
    RuriDomain = 'ruri_domain',
    RuriUri = 'ruri_uri',
    PaiUser = 'pai_user',
    PaiDomain = 'pai_domain',
    PaiUri = 'pai_uri'
}

export class VoipPeeringInboundRule {
    id: number
    groupId: number
    field: string
    pattern: string
    rejectCode?: number | null
    rejectReason?: string | null
    priority: number
    enabled: boolean
}