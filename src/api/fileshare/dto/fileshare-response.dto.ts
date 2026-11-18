import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsInt, IsNotEmpty, IsNumber, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'

export class FileshareResponseDto extends ResponseDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Id of the file'})
        id: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'File name'})
        name: string

    @IsString()
    @IsNotEmpty()
        mime_type: string

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty({description: 'Time to live in seconds'})
        ttl: number

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty({description: 'Size in bytes'})
        size: number

    @DateTimeField()
    @IsDate()
    @ApiProperty({description: 'Upload time'})
        created_at: Date

    @DateTimeField()
    @IsDate()
    @ApiProperty({description: 'Expiry time, the file is deleted afterwards'})
        expires_at: Date

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Subscriber who uploaded the file'})
        subscriber_id?: number

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Reseller of the uploader'})
        reseller_id?: number
}
