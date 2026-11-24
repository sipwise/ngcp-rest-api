import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringRuleOverviewSearchDto {
    @ApiPropertyOptional({description: 'Id of the peering group rule'})
        rule_id: number
    @ApiPropertyOptional({description: 'Peering group of the rule'})
        group_id: number
    @ApiPropertyOptional({description: 'Peering group server of the row'})
        server_id: number
    @ApiPropertyOptional({description: 'Callee number prefix the rule matches, e.g. 43'})
        callee_prefix: string
    @ApiPropertyOptional({description: 'PCRE regex matched against the full Request-URI, e.g. `^sip:431`'})
        callee_pattern: string
    @ApiPropertyOptional({description: 'PCRE regex matched against the caller URI `sip:user@domain`, e.g. `^sip:.+@example\\.org$`'})
        caller_pattern: string
    @ApiPropertyOptional({description: 'Description of the rule'})
        description: string
    @ApiPropertyOptional({description: 'Rule is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'No further rules are processed when this rule matches'})
        stopper: boolean
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
