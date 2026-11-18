import {ApiProperty} from '@nestjs/swagger'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringInboundRuleResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the peering group inbound rule'})
        id: number

    @Expand('peerings/groups')
    @ApiProperty({description: 'Peering group of the rule'})
        group_id: number

    @ApiProperty({description: 'Field of the inbound SIP message the pattern is matched against'})
        field: string

    @ApiProperty({description: 'PCRE regex matched against the field, e.g. `^sip:431` for a full URI'})
        pattern: string

    @ApiProperty({description: 'SIP code (400-699) to reject calls from the group servers that do not match the pattern; null = no rejection'})
        reject_code: number

    @ApiProperty({description: 'Reason phrase of the rejection; used with reject_code'})
        reject_reason: string

    @ApiProperty({description: 'Priority of the rule, unique within the group; lower values are checked first'})
        priority: number

    @ApiProperty({description: 'Rule is enabled'})
        enabled: boolean

    constructor(entity: internal.VoipPeeringInboundRule, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.group_id = entity.groupId
        this.field = entity.field
        this.pattern = entity.pattern
        this.reject_code = entity.rejectCode
        this.reject_reason = entity.rejectReason
        this.priority = entity.priority
        this.enabled = entity.enabled
    }
}