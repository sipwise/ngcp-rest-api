/**
 * An inbound rule of a peering group with one server of the group. The server fields are null if the group has
 * no servers.
 */
export class PeeringOverviewInboundRule {
    id: string
    ruleId: number
    groupId: number
    field: string
    pattern: string
    rejectCode?: number | null
    rejectReason?: string | null
    priority: number
    enabled: boolean
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
