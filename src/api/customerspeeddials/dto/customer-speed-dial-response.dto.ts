import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerSpeedDialResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the customer speed dial'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Customer owning the speed dial'})
        customer_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial slot'})
        slot: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial destination'})
        destination: string

    constructor(csd: internal.CustomerSpeedDial, options?: ResponseDtoOptions) {
        super(options)
        this.id = csd.id
        this.customer_id = csd.contractId
        this.slot = csd.slot
        this.destination = csd.destination
    }
}