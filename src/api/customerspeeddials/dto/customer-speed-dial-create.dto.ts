import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsArray, IsNotEmpty, ValidateNested} from 'class-validator'
import {CustomerSpeedDialEntryDto} from './customer-speed-dial-entry.dto'
import {Type} from 'class-transformer'

export class CustomerSpeedDialCreateDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Customer id', example: 1})
        customer_id: number

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerSpeedDialEntryDto)
    @ApiProperty({description: 'Speed dial entries', example: '[{"slot": "*0", "destination": "sip:4310001@exampledomain.org"}]'})
        speeddials: CustomerSpeedDialEntryDto[]

    toInternal(): internal.CustomerSpeedDial {
        const csd = new internal.CustomerSpeedDial()
        csd.contract_id = this.customer_id
        csd.speeddials = this.speeddials
        return csd
    }
}
