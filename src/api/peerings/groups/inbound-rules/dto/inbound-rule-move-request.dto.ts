import {ApiProperty} from '@nestjs/swagger'
import {IsEnum} from 'class-validator'

import {VoipPeeringInboundRuleMoveDirection} from '~/entities/internal/voip-peering-inbound-rule.internal.entity'

export class PeeringInboundRuleMoveRequestDto {
    @IsEnum(VoipPeeringInboundRuleMoveDirection)
    @ApiProperty({
        description: 'Direction in the rule order of the group: `up` swaps the priority with the previous rule, `down` with the next one',
        enum: VoipPeeringInboundRuleMoveDirection,
    })
        direction: VoipPeeringInboundRuleMoveDirection
}
