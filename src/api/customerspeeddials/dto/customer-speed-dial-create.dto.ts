import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

export class CustomerSpeedDialCreateDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Customer id', example: 1})
        customer_id: number

    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial slot', example: '*3'})
        slot: string

    @IsNotEmpty()
    @ApiProperty({description: 'Destination number or sip-uri', example: '4310001 or sip:4310001@exampledomain.org'})
        destination: string

    toInternal(): internal.CustomerSpeedDial {
        const csd = new internal.CustomerSpeedDial()
        csd.contract_id = this.customer_id
        csd.slot = this.slot
        csd.destination = this.destination
        return csd
    }
}
