import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringRuleResponseDto extends ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
        group_id: number

    @ApiProperty()
        callee_prefix: string

    @ApiProperty()
        callee_pattern: string | null

    @ApiProperty()
        caller_pattern: string | null

    @ApiProperty()
        description: string

    @ApiProperty()
        enabled: boolean

    @ApiProperty()
        stopper: boolean

    constructor(entity: internal.VoipPeeringRule, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.group_id = entity.groupId
        this.callee_prefix = entity.calleePrefix
        this.callee_pattern = entity.calleePattern
        this.caller_pattern = entity.callerPattern
        this.description = entity.description
        this.enabled = entity.enabled
        this.stopper = entity.stopper
    }
}