import {ApiProperty} from '@nestjs/swagger'
import {ResponseDto} from '../../../dto/response.dto'

export class ClearCallCounterResponseDto implements ResponseDto  {
    @ApiProperty()
        call_id: string
    constructor(callId: string) {
        this.call_id = callId
    }
}
