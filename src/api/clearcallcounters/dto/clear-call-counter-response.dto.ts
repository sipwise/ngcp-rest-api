import {ApiProperty} from '@nestjs/swagger'
import {IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'

export class ClearCallCounterResponseDto implements ResponseDto  {
    @IsString()
    @ApiProperty()
        call_id!: string
    constructor(callId: string) {
        this.call_id = callId
    }
}
