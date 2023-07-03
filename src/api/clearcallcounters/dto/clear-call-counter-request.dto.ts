import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {RequestDto} from '../../../dto/request.dto'

export class ClearCallCounterRequestDto implements RequestDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Call ID', example: '12345-67890'})
        call_id: string

    toInternal?(): void;
}
