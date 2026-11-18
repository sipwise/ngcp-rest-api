import {ApiProperty} from '@nestjs/swagger'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'


export class PeeringGroupServerResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the peering group server'})
        id: number

    @Expand('peerings/groups')
    @ApiProperty({description: 'Peering group of the server'})
        group_id: number

    @ApiProperty({description: 'Name of the server'})
        name: string

    @ApiProperty({description: 'IP address of the server'})
        ip: string

    @ApiProperty({description: 'Hostname of the server, used in the Request-URI instead of the IP address; null = IP address'})
        host?: string | null

    @ApiProperty({description: 'SIP port of the server'})
        port: number

    @ApiProperty({description: 'SIP transport: 1 = UDP, 2 = TCP, 3 = TLS'})
        transport: number

    @ApiProperty({description: 'Load share weight among the servers of the group; higher values get more calls'})
        weight: number

    @ApiProperty({description: 'SIP route the calls are sent through, one of the configured external SBCs (`<sip:...;lr>`); null = none'})
        via_route: string | null

    @ApiProperty({description: 'Calls are sent via the load balancer'})
        via_lb: boolean

    @ApiProperty({description: 'Server is enabled'})
        enabled: boolean

    @ApiProperty({description: 'Server reachability is checked with SIP pings; if disabled, calls are always sent to it'})
        probe: boolean

    @ApiProperty({description: 'Site the server is used on; null = all sites'})
        site_id?: number | null

    constructor(entity: internal.VoipPeeringServer, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.group_id = entity.groupId
        this.name = entity.name
        this.ip = entity.ip
        this.host = entity.host
        this.port = entity.port
        this.transport = entity.transport
        this.weight = entity.weight
        this.via_route = entity.viaRoute
        this.via_lb = entity.viaLB
        this.enabled = entity.enabled
        this.probe = entity.probe
        this.site_id = entity.siteId
    }
}