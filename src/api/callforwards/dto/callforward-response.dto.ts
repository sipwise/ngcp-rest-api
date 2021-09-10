import {CallforwardBaseDto} from './callforward-base.dto'
import {ApiProperty} from '@nestjs/swagger'

export class CallforwardResponseDto extends CallforwardBaseDto {
    @ApiProperty({description: 'Unique identifier of the Call Forward'})
    id: number
}
