import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringGroupServerSearchDto {
    @ApiPropertyOptional({description: 'Name of the server'})
        name: string
    @ApiPropertyOptional({description: 'Peering group of the server'})
        group_id: number
    @ApiPropertyOptional({description: 'IP address of the server'})
        ip: string
    @ApiPropertyOptional({description: 'Hostname of the server, used in the Request-URI instead of the IP address; null = IP address'})
        host?: string | null
    @ApiPropertyOptional({description: 'SIP port of the server'})
        port: number
    @ApiPropertyOptional({description: 'SIP transport: 1 = UDP, 2 = TCP, 3 = TLS'})
        transport: number
    @ApiPropertyOptional({description: 'Load share weight among the servers of the group; higher values get more calls'})
        weight: number
    @ApiPropertyOptional({description: 'SIP route the calls are sent through, one of the configured external SBCs (`<sip:...;lr>`); null = none'})
        via_route: string | null
    @ApiPropertyOptional({description: 'Calls are sent via the load balancer'})
        via_lb: boolean
    @ApiPropertyOptional({description: 'Server is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'Server reachability is checked with SIP pings; if disabled, calls are always sent to it'})
        probe: boolean
    @ApiPropertyOptional({description: 'Id of the peering group server'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'server.id',
        }
}
