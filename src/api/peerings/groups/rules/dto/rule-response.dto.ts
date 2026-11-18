import {ApiProperty} from '@nestjs/swagger'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringRuleResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the peering group rule'})
        id: number

    @Expand('peerings/groups')
    @ApiProperty({description: 'Peering group of the rule'})
        group_id: number

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