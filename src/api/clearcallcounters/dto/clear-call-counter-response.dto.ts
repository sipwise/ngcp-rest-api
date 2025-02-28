import {ApiProperty} from '@nestjs/swagger'
import {IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class ClearCallCounterResponseDto extends ResponseDto  {
    @IsString()
    @ApiProperty()
        call_id!: string

    constructor(callId: string, options?: ResponseDtoOptions) {
        super(options)
        this.call_id = callId
    }
}
