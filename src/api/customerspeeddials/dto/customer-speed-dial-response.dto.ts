import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerSpeedDialResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        customer_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        slot: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        destination: string

    constructor(csd: internal.CustomerSpeedDial, options?: ResponseDtoOptions) {
        super(options)
        this.id = csd.id
        this.customer_id = csd.contractId
        this.slot = csd.slot
        this.destination = csd.destination
    }
}