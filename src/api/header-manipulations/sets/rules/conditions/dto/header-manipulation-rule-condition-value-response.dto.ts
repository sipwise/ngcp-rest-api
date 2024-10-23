import {internal} from '~/entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {ResponseDto} from '~/dto/response.dto'

export class HeaderManipulationRuleConditionValueResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

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