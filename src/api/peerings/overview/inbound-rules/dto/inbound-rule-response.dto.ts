import {ApiProperty} from '@nestjs/swagger'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringInboundRuleOverviewResponseDto extends ResponseDto {
    @ApiProperty({description: 'Composed id `<rule_id>-<server_id>` of the row, `<rule_id>-0` if the group has no server'})
        id: string

    @Expand('peerings/groups/inbound-rules')
    @ApiProperty({description: 'Id of the peering group inbound rule'})
        rule_id: number

    @Expand('peerings/groups')
    @ApiProperty({description: 'Peering group of the rule'})
        group_id: number

    @Expand('peerings/groups/servers')
    @ApiProperty({description: 'Peering group server of the row, null if the group has no server'})
        server_id: number | null

    @ApiProperty({description: 'Field of the inbound SIP message the pattern is matched against'})
        field: string

    @ApiProperty({description: 'PCRE regex matched against the field, e.g. `^sip:431` for a full URI'})
        pattern: string

    @ApiProperty({description: 'SIP code (400-699) to reject calls from the group servers that do not match the pattern, null if calls are not rejected'})
        reject_code: number | null

    @ApiProperty({description: 'Reason phrase sent with reject_code'})
        reject_reason: string | null

    @ApiProperty({description: 'Priority of the rule, unique within the group. Lower values are checked first'})
        priority: number

    @ApiProperty({description: 'Rule is enabled'})
        enabled: boolean

    @ApiProperty({description: 'Name of the peering group'})
        group_name: string

    @ApiProperty({description: 'Priority of the group, 1 (highest) to 9 (lowest)'})
        group_priority: number

    @ApiProperty({description: 'Name of the server'})
        server_name: string | null

    @ApiProperty({description: 'Hostname of the server, used in the Request-URI instead of the IP address if set'})
        server_host: string | null

    @ApiProperty({description: 'IP address of the server'})
        server_ip: string | null

    @ApiProperty({description: 'SIP port of the server'})
        server_port: number | null

    @ApiProperty({description: 'SIP transport: 1 = UDP, 2 = TCP, 3 = TLS'})
        server_transport: number | null

    @ApiProperty({description: 'Load share weight among the servers of the group. Higher values get more calls'})
        server_weight: number | null

    @ApiProperty({description: 'Server is enabled'})
        server_enabled: boolean | null

    constructor(entity: internal.PeeringOverviewInboundRule, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.rule_id = entity.ruleId
        this.group_id = entity.groupId
        this.server_id = entity.serverId
        this.field = entity.field
        this.pattern = entity.pattern
        this.reject_code = entity.rejectCode
        this.reject_reason = entity.rejectReason
        this.priority = entity.priority
        this.enabled = entity.enabled
        this.group_name = entity.groupName
        this.group_priority = entity.groupPriority
        this.server_name = entity.serverName
        this.server_host = entity.serverHost
        this.server_ip = entity.serverIp
        this.server_port = entity.serverPort
        this.server_transport = entity.serverTransport
        this.server_weight = entity.serverWeight
        this.server_enabled = entity.serverEnabled
    }
}
