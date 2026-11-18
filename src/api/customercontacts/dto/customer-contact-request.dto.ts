import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Length, MaxLength} from 'class-validator'

import {IsTimezoneName} from '~/decorators/is-timezone-name.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'

export class CustomerContactRequestDto implements RequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Name of the bank'})
        bankname?: string

    @IsOptional()
    @IsString()
    @MaxLength(11)
    @ApiPropertyOptional({description: 'BIC (Business Identifier Code) of the bank account'})
        bic?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'City'})
        city?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'Company name'})
        company?: string

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional({description: 'Company registration number'})
        comregnum?: string

    @IsOptional()
    @IsString()
    @Length(2, 2)
    @ApiPropertyOptional({description: 'Two-letter ISO 3166-1 country code, e.g. `US` or `DE`'})
        country?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Email address'})
        email?: string

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional({description: 'Fax number'})
        faxnumber?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'Given name'})
        firstname?: string

    @IsOptional()
    @IsEnum(ContactGender)
    @ApiPropertyOptional({description: '`male` or `female`'})
        gender?: ContactGender

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp0?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp1?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp2?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp3?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp4?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp5?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp6?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp7?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp8?: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp9?: string

    @IsOptional()
    @IsString()
    @MaxLength(34)
    @ApiPropertyOptional({description: 'IBAN (International Bank Account Number) of the bank account'})
        iban?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'Surname'})
        lastname?: string

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional({description: 'Mobile number'})
        mobilenumber?: string

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'Contact receives the newsletter'})
        newsletter?: boolean

    @IsOptional()
    @IsString()
    @MaxLength(31)
    @ApiPropertyOptional({description: 'Phone number'})
        phonenumber?: string

    @IsOptional()
    @IsString()
    @MaxLength(16)
    @ApiPropertyOptional({description: 'Postal code'})
        postcode?: string

    @ApiPropertyOptional({
        description: 'Reseller of the contact; required for admin roles, the own reseller for reseller roles',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    @IsNotEmpty()
    @IsEnum(ContactStatus)
    @ApiProperty({description: '`active`, or `terminated` once deleted while terminated contracts or subscribers still use it'})
        status: ContactStatus

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'Street address'})
        street?: string

    @IsOptional()
    @IsString()
    @IsTimezoneName()
    @MaxLength(80)
    @ApiPropertyOptional({description: 'Time zone, IANA name such as `Europe/Vienna`'})
        timezone?: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'VAT number'})
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
