import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {CustomerSpeedDialEntryDto} from './customer-speed-dial-entry.dto'
import {IsArray, IsNotEmpty, ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class CustomerSpeedDialResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerSpeedDialEntryDto)
    @ApiProperty()
        speeddials: CustomerSpeedDialEntryDto[]

    constructor(csd: internal.CustomerSpeedDial) {
        this.id = csd.contract_id
        this.speeddials = csd.speeddials
    }
}