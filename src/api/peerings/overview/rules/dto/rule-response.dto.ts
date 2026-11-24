import {ApiProperty} from '@nestjs/swagger'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringRuleOverviewResponseDto extends ResponseDto {
    @ApiProperty({description: 'Composed id `<rule_id>-<server_id>` of the row, `<rule_id>-0` if the group has no server'})
        id: string

    @Expand('peerings/groups/rules')
    @ApiProperty({description: 'Id of the peering group rule'})
        rule_id: number

    @Expand('peerings/groups')
    @ApiProperty({description: 'Peering group of the rule'})
        group_id: number

    @Expand('peerings/groups/servers')
    @ApiProperty({description: 'Peering group server of the row, null if the group has no server'})
        server_id: number | null

    @ApiProperty({description: 'Callee number prefix the rule matches, e.g. 43'})
        callee_prefix: string

    @ApiProperty({description: 'PCRE regex matched against the full Request-URI, e.g. `^sip:431`'})
        callee_pattern: string | null

    @ApiProperty({description: 'PCRE regex matched against the caller URI `sip:user@domain`, e.g. `^sip:.+@example\\.org$`'})
        caller_pattern: string | null

    @ApiProperty({description: 'Description of the rule'})
        description: string

    @ApiProperty({description: 'Rule is enabled'})
        enabled: boolean

    @ApiProperty({description: 'No further rules are processed when this rule matches'})
        stopper: boolean

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

    constructor(entity: internal.PeeringOverviewRule, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.rule_id = entity.ruleId
        this.group_id = entity.groupId
        this.server_id = entity.serverId
        this.callee_prefix = entity.calleePrefix
        this.callee_pattern = entity.calleePattern
        this.caller_pattern = entity.callerPattern
        this.description = entity.description
        this.enabled = entity.enabled
        this.stopper = entity.stopper
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
