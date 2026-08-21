import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {IsValidViaRouteString} from '~/decorators/is-valid-via-route-string'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class PeeringGroupServerRequestDto implements RequestDto {
    @IsInt()
    @IsPositive()
    @ApiProperty()
        group_id: number

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty()
        ip: string

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiPropertyOptional()
        host?: string

    @IsInt()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty()
        port: number

    @IsOptional()
    @IsEnum([1,2,3])
    @ApiPropertyOptional()
        transport: number

    @IsInt()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty()
        weight: number

    @CanBeNull()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @IsValidViaRouteString()
    @ApiPropertyOptional()
        via_route?: string | null

    @IsBoolean()
    @ApiProperty()
        via_lb: boolean = false

    @IsBoolean()
    @ApiProperty()
        enabled: boolean

    @IsBoolean()
    @ApiProperty()
        probe: boolean

    @IsInt()
    @IsPositive()
    @IsOptional()
    @ApiProperty()
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
