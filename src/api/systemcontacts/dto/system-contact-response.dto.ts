import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsInt, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class SystemContactResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @CanBeNull()
    @IsString()
    @ApiProperty()
        bankname?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        bic?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        city?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        company?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        comregnum?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        country?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        email?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        faxnumber?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        firstname?: string

    @IsEnum(ContactGender)
    @ApiProperty()
        gender?: ContactGender

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp0?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp1?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp2?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp3?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp4?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp5?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp6?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp7?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp8?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        gpp9?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        iban?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        lastname?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        mobilenumber?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        newsletter: boolean

    @CanBeNull()
    @IsString()
    @ApiProperty()
        phonenumber?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        postcode?: string

    @IsEnum(ContactStatus)
    @ApiProperty()
        status: ContactStatus

    @CanBeNull()
    @IsString()
    @ApiProperty()
        street?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        timezone?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        vatnum?: string

    constructor(contact: internal.Contact, options?: ResponseDtoOptions) {
        super(options)
        // delete field reseller_id as fields are not assigned individually
        delete contact.reseller_id

        Object.keys(contact).map(key => {
            this[key] = contact[key]
        })
    }
}
