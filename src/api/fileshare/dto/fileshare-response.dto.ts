import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsInt, IsNotEmpty, IsNumber, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'

export class FileshareResponseDto implements ResponseDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        id: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
        mime_type: string

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
        ttl: number

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
        size: number

    @IsDate()
    @ApiProperty()
        created_at: Date

    @IsDate()
    @ApiProperty()
        expires_at: Date

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        subscriber_id?: number

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        reseller_id?: number
}
