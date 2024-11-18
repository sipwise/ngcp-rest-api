import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class CustomerSpeedDialResponseDto implements ResponseDto {
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

    constructor(csd: internal.CustomerSpeedDial) {
        this.id = csd.id
        this.customer_id = csd.contractId
        this.slot = csd.slot
        this.destination = csd.destination
    }
}