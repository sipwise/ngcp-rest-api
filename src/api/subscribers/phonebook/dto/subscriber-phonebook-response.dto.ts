import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class SubscriberPhonebookResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty()
        id: string

    @IsInt()
    @ApiProperty()
        subscriber_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        number: string

    @IsBoolean()
    @ApiProperty()
        shared: boolean

    constructor(entity: internal.SubscriberPhonebook | internal.VSubscriberPhonebook, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id.toString()
        this.subscriber_id = entity.subscriberId
        this.name = entity.name
        this.number = entity.number
        this.shared = entity.shared
    }
}