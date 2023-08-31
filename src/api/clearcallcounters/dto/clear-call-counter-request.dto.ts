import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {RequestDto} from '../../../dto/request.dto'

export class ClearCallCounterRequestDto implements RequestDto {
    toInternal?(): void;
}
