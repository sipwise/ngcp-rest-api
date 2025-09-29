import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringInboundRuleResponseDto extends ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
        group_id: number

    @ApiProperty()
        field: string

    @ApiProperty()
        pattern: string

    @ApiProperty()
        reject_code: number

    @ApiProperty()
        reject_reason: string

    @ApiProperty()
        enabled: boolean

    constructor(entity: internal.VoipPeeringInboundRule, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.group_id = entity.groupId
        this.field = entity.field
        this.pattern = entity.pattern
        this.reject_code = entity.rejectCode
        this.reject_reason = entity.rejectReason
        this.enabled = entity.enabled
    }
}