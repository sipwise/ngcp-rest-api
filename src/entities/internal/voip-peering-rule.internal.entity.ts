export class VoipPeeringRule {
    id: number
    groupId: number
    calleePrefix: string
    calleePattern: string
    callerPattern?: string | null
    description: string
    enabled: boolean
    stopper: boolean
}