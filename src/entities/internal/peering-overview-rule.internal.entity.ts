/**
 * A rule of a peering group with one server of the group. The server fields are null if the group has no
 * servers.
 */
export class PeeringOverviewRule {
    id: string
    ruleId: number
    groupId: number
    calleePrefix: string
    calleePattern?: string | null
    callerPattern?: string | null
    description: string
    enabled: boolean
    stopper: boolean
    groupName: string
    groupPriority: number
    serverId: number | null
    serverName: string | null
    serverHost: string | null
    serverIp: string | null
    serverPort: number | null
    serverTransport: number | null
    serverWeight: number | null
    serverEnabled: boolean | null
}
