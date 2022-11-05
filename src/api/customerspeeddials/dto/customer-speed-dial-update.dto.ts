import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsArray, ValidateNested} from 'class-validator'
import {CustomerSpeedDialEntryDto} from './customer-speed-dial-entry.dto'
import {Type} from 'class-transformer'

export class CustomerSpeedDialUpdateDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerSpeedDialEntryDto)
    @ApiProperty({description: 'Speed dial entries', example: '[{"slot": "*0", "destination": "sip:4310001@exampledomain.org"}]'})
        speeddials: CustomerSpeedDialEntryDto[]

    toInternal(contract_id: number): internal.CustomerSpeedDial {
        const csd = new internal.CustomerSpeedDial()
        csd.contract_id = contract_id
        csd.speeddials = this.speeddials
        return csd
    }
}
