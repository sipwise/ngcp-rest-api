export class VoipPeeringServer {
    id: number
    groupId: number
    name: string
    ip: string
    host?: string | null
    port: number
    transport?: number | null
    weight: number
    viaRoute?: string | null
    viaLB?: boolean
    enabled: boolean
    probe: boolean
}