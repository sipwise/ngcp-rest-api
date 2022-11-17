import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

export class ClearCallCounterCreateDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Call ID', example: '12345-67890'})
        call_id: string
}
