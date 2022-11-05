import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

export class CustomerSpeedDialEntryDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial slot', example: '*3'})
    slot: string

    @IsNotEmpty()
    @ApiProperty({description: 'Destination number or sip-uri', example: '4310001 or sip:4310001@exampledomain.org'})
    destination: string
}
