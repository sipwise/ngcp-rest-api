import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class HeaderManipulationRuleConditionValueResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        value: string

    constructor(entity?: internal.HeaderRuleConditionValue, options?: ResponseDtoOptions) {
        super(options)
        if (!entity)
            return
        this.id = entity.id
        this.value = entity.value
    }
}