import {internal} from '../../../entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

export class CustomerSpeedDialCreateDto {
    @IsNotEmpty()
    @ApiPropertyOptional({description: 'Customer id', example: 1})
        customer_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial slot', example: '*0'})
        slot: string

    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial destination', example: 'sip:4310001@exampledomain.org'})
        destination: string

    toInternal(): internal.CustomerSpeedDial {
        const csd = new internal.CustomerSpeedDial()
        csd.contractId = this.customer_id
        csd.slot = this.slot
        csd.destination = this.destination
        return csd
    }
}
