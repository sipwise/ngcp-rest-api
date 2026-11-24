import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringInboundRuleOverviewSearchDto {
    @ApiPropertyOptional({description: 'Id of the peering group inbound rule'})
        rule_id: number
    @ApiPropertyOptional({description: 'Peering group of the rule'})
        group_id: number
    @ApiPropertyOptional({description: 'Peering group server of the row'})
        server_id: number
    @ApiPropertyOptional({description: 'Field of the inbound SIP message the pattern is matched against'})
        field: string
    @ApiPropertyOptional({description: 'PCRE regex matched against the field, e.g. `^sip:431` for a full URI'})
        pattern: string
    @ApiPropertyOptional({description: 'SIP code (400-699) to reject calls from the group servers that do not match the pattern, null if calls are not rejected'})
        reject_code: number
    @ApiPropertyOptional({description: 'Reason phrase sent with reject_code'})
        reject_reason: string
    @ApiPropertyOptional({description: 'Priority of the rule, unique within the group. Lower values are checked first'})
        priority: number
    @ApiPropertyOptional({description: 'Rule is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'Name of the peering group'})
        group_name: string
    @ApiPropertyOptional({description: 'Priority of the group, 1 (highest) to 9 (lowest)'})
        group_priority: number
    @ApiPropertyOptional({description: 'Name of the server'})
        server_name: string
    @ApiPropertyOptional({description: 'Hostname of the server, used in the Request-URI instead of the IP address if set'})
        server_host: string
    @ApiPropertyOptional({description: 'IP address of the server'})
        server_ip: string
    @ApiPropertyOptional({description: 'SIP port of the server'})
        server_port: number
    @ApiPropertyOptional({description: 'SIP transport: 1 = UDP, 2 = TCP, 3 = TLS'})
        server_transport: number
    @ApiPropertyOptional({description: 'Load share weight among the servers of the group. Higher values get more calls'})
        server_weight: number
    @ApiPropertyOptional({description: 'Server is enabled'})
        server_enabled: boolean
    @ApiHideProperty()
        _alias = {
            id: 'rule.id',
            rule_id: 'rule.id',
            group_name: 'grp.name',
            group_priority: 'grp.priority',
            server_id: 'server.id',
            server_name: 'server.name',
            server_host: 'server.host',
            server_ip: 'server.ip',
            server_port: 'server.port',
            server_transport: 'server.transport',
            server_weight: 'server.weight',
            server_enabled: 'server.enabled',
        }
}
