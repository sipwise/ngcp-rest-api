import {IsNumber, IsNumberString, IsOptional} from 'class-validator'
import {RequestDto} from '../../../dto/request.dto'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class FileshareRequestDto implements RequestDto {
    @ApiProperty({
        description: 'File to upload',
        type: 'string',
        format: 'binary',
    })
        file: string

    @ApiPropertyOptional({
        description: 'Time to live in seconds',
        example: 3600,
    })
    @IsOptional()
    @IsNumberString() // form-data sends numbers as strings
        ttl?: number

    toInternal?(): void;
}
