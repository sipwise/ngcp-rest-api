import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class HeaderManipulationRuleConditionValueResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        value: string

    constructor(entity?: internal.HeaderRuleConditionValue) {
        if (!entity)
            return
        this.id = entity.id
        this.value = entity.value
    }
}