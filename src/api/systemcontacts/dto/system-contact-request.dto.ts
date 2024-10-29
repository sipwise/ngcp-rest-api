import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'

export class SystemContactRequestDto implements RequestDto {
    @IsOptional()
    @ApiPropertyOptional()
        bankname?: string

    @IsOptional()
    @ApiPropertyOptional()
        bic?: string

    @IsOptional()
    @ApiPropertyOptional()
        city?: string

    @IsOptional()
    @ApiPropertyOptional()
        company?: string

    @IsOptional()
    @ApiPropertyOptional()
        comregnum?: string

    @IsOptional()
    @ApiPropertyOptional()
        country?: string

    @IsOptional()
    @ApiPropertyOptional()
        email?: string

    @IsOptional()
    @ApiPropertyOptional()
        faxnumber?: string

    @IsOptional()
    @ApiPropertyOptional()
        firstname?: string

    @IsOptional()
    @ApiPropertyOptional()
        gender?: ContactGender

    @IsOptional()
    @ApiPropertyOptional()
        gpp0?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp1?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp2?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp3?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp4?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp5?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp6?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp7?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp8?: string

    @IsOptional()
    @ApiPropertyOptional()
        gpp9?: string

    @IsOptional()
    @ApiPropertyOptional()
        iban?: string

    @IsOptional()
    @ApiPropertyOptional()
        lastname?: string

    @IsOptional()
    @ApiPropertyOptional()
        mobilenumber?: string

    @IsOptional()
    @ApiPropertyOptional()
        newsletter?: boolean

    @IsOptional()
    @ApiPropertyOptional()
        phonenumber?: string

    @IsOptional()
    @ApiPropertyOptional()
        postcode?: string

    @IsNotEmpty()
    @IsEnum(ContactStatus)
    @ApiProperty()
        status: ContactStatus

    @IsOptional()
    @ApiPropertyOptional()
        street?: string

    @IsOptional()
    @ApiPropertyOptional()
        timezone?: string

    @IsOptional()
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
        if (options.id)
            contact.id = options.id

        if (options.assignNulls) {
            Object.keys(contact).forEach(k => {
                if (contact[k] === undefined)
                    contact[k] = null
            })
        }
        return contact
    }
}
