import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Length, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'

export class CustomerContactRequestDto implements RequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        bankname?: string

    @IsOptional()
    @IsString()
    @MaxLength(11)
    @ApiPropertyOptional()
        bic?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional()
        city?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional()
        company?: string

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional()
        comregnum?: string

    @IsOptional()
    @IsString()
    @Length(2, 2)
    @ApiPropertyOptional()
        country?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        email?: string

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional()
        faxnumber?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional()
        firstname?: string

    @IsOptional()
    @IsEnum(ContactGender)
    @ApiPropertyOptional()
        gender?: ContactGender

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp0?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp1?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp2?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp3?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp4?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp5?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp6?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp7?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp8?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional()
        gpp9?: string

    @IsOptional()
    @IsString()
    @MaxLength(34)
    @ApiPropertyOptional()
        iban?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional()
        lastname?: string

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional()
        mobilenumber?: string

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional()
        newsletter?: boolean

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional()
        phonenumber?: string

    @IsOptional()
    @IsString()
    @MaxLength(16)
    @ApiPropertyOptional()
        postcode?: string

    @ApiPropertyOptional({
        description: 'Reseller Id, mandatory for admin and system roles, must not be provided by reseller roles' +
            ' as it is automatically set to the reseller_id of the user',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    @IsNotEmpty()
    @IsEnum(ContactStatus)
    @ApiProperty()
        status: ContactStatus

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional()
        street?: string

    @IsOptional()
    @IsString()
    @MaxLength(80)
    @ApiPropertyOptional()
        timezone?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional()
        vatnum?: string

    constructor(entity?: internal.Contact) {
        if (!entity)
            return

        // TODO rework as the Dto key names are not always equal to the Entity ones
        Object.keys(entity).map(key => {
            this[key] = entity[key]
        })
    }

    toInternal(options: RequestDtoOptions = {}): internal.Contact {
        const contact = internal.Contact.create(this)
        if (options.id) {
            contact.id = options.id
            // on update a missing field is either removed by PATCH or not provided by PUT
            for (const key of Object.keys(new CustomerContactRequestDto())) {
                if (contact[key] === undefined)
                    contact[key] = null
            }
        }

        if (options.assignNulls) {
            Object.keys(contact).forEach(k => {
                if (contact[k] === undefined)
                    contact[k] = null
            })
        }
        return contact
    }
}
