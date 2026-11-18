import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {IsValidViaRouteString} from '~/decorators/is-valid-via-route-string'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class PeeringGroupServerRequestDto implements RequestDto {
    @IsInt()
    @IsPositive()
    @ApiProperty({description: 'Peering group of the server'})
        group_id: number

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty({description: 'Name of the server'})
        name: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty({description: 'IP address of the server'})
        ip: string

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiPropertyOptional({description: 'Hostname of the server, used in the Request-URI instead of the IP address; null = IP address'})
        host?: string

    @IsInt()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({description: 'SIP port of the server'})
        port: number

    @IsOptional()
    @IsEnum([1,2,3])
    @ApiPropertyOptional({description: 'SIP transport: 1 = UDP, 2 = TCP, 3 = TLS'})
        transport: number

    @IsInt()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({description: 'Load share weight among the servers of the group; higher values get more calls'})
        weight: number

    @CanBeNull()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @IsValidViaRouteString()
    @ApiPropertyOptional({description: 'SIP route the calls are sent through, one of the configured external SBCs (`<sip:...;lr>`); null = none'})
        via_route?: string | null

    @IsBoolean()
    @ApiProperty({description: 'Calls are sent via the load balancer'})
        via_lb: boolean = false

    @IsBoolean()
    @ApiProperty({description: 'Server is enabled'})
        enabled: boolean

    @IsBoolean()
    @ApiProperty({description: 'Server reachability is checked with SIP pings; if disabled, calls are always sent to it'})
        probe: boolean

    @IsInt()
    @IsPositive()
    @IsOptional()
    @ApiProperty({description: 'Site the server is used on; null = all sites'})
        site_id: number

    constructor(entity?: internal.VoipPeeringServer) {
        if (!entity)
            return
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

    toInternal(options: RequestDtoOptions = {}): internal.VoipPeeringServer {
        const entity = new internal.VoipPeeringServer()
        entity.groupId = this.group_id
        entity.name = this.name
        entity.ip = this.ip
        entity.host = this.host
        entity.port = this.port
        entity.transport = this.transport
        entity.weight = this.weight
        entity.viaRoute = this.via_route
        entity.viaLB = this.via_lb
        entity.enabled = this.enabled
        entity.probe = this.probe
        entity.siteId = this.site_id
        if (options.id)
            entity.id = options.id

        if (options.assignNulls) {
            Object.keys(entity).forEach(k => {
                if (entity[k] === undefined)
                    entity[k] = null
            })
        }
        return entity
    }
}
