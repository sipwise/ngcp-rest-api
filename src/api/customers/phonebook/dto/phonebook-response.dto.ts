import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerPhonebookResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty({description: 'Id of the own phonebook entry or composed id of an included "inherited" phonebook entry'})
        id: string

    @IsInt()
    @ApiProperty({description: 'Customer owning the entry'})
        customer_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Phone number or SIP URI'})
        number: string

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'Entry belongs to the customer, not to its reseller'})
        own?: boolean

    constructor(entity: internal.CustomerPhonebook | internal.VCustomerPhonebook, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id.toString()
        this.customer_id = entity.contractId
        this.name = entity.name
        this.number = entity.number
        if (entity instanceof internal.VCustomerPhonebook)
            this.own = entity.own
    }
}