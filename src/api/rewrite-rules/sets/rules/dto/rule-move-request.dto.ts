import {ApiProperty} from '@nestjs/swagger'
import {IsEnum} from 'class-validator'

import {RewriteRuleMoveDirection} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleMoveRequestDto {
    @IsEnum(RewriteRuleMoveDirection)
    @ApiProperty({
        description: 'Move direction in the rule order of the set. `up` swaps the priority with the previous rule of the same direction and field, `down` with the next one',
        enum: RewriteRuleMoveDirection,
    })
        direction: RewriteRuleMoveDirection
}
