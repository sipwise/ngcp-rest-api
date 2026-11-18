import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class ResellerPhonebookResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the phonebook entry'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Reseller owning the entry; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Phone number or SIP URI'})
        number: string

    constructor(entity: internal.ResellerPhonebook, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.number = entity.number
    }
}