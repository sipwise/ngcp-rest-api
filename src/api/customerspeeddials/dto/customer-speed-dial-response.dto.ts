import {internal} from '~/entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {ResponseDto} from '~/dto/response.dto'

export class CustomerSpeedDialResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsNotEmpty()
    @ApiProperty()
        customer_id: number

    @IsNotEmpty()
    @ApiProperty()
        slot: string

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