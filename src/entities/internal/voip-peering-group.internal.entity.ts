export class VoipPeeringGroup {
    id: number
    name: string
    description?: string | null
    priority: number
    peeringContractId?: number | null
    hasInboundRules: boolean
    timeSetId?: number | null
}