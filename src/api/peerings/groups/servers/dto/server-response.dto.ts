import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'


export class PeeringGroupServerResponseDto extends ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
        group_id: number

    @ApiProperty()
        name: string

    @ApiProperty()
        ip: string

    @ApiProperty()
        host?: string | null

    @ApiProperty()
        port: number

    @ApiProperty()
        transport: number

    @ApiProperty()
        weight: number

    @ApiProperty()
        via_route: string | null

    @ApiProperty()
        via_lb: boolean

    @ApiProperty()
        enabled: boolean

    @ApiProperty()
        probe: boolean

    @ApiProperty()
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