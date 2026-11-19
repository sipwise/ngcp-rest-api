import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsDate, IsEnum, IsInt, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class SystemContactResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the system contact'})
        id: number

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Name of the bank'})
        bankname?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'BIC (Business Identifier Code) of the bank account'})
        bic?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'City'})
        city?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Company name'})
        company?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Company registration number'})
        comregnum?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Two-letter ISO 3166-1 country code, e.g. `AT` or `DE`'})
        country?: string

    @DateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time of creation, null if unknown'})
        create_timestamp?: Date

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Email address'})
        email?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Fax number'})
        faxnumber?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Given name'})
        firstname?: string

    @CanBeNull()
    @IsEnum(ContactGender)
    @ApiProperty({description: '`male` or `female`'})
        gender?: ContactGender

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp0?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp1?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp2?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp3?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp4?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp5?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp6?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp7?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp8?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'General purpose field for free use'})
        gpp9?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'IBAN (International Bank Account Number) of the bank account'})
        iban?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Surname'})
        lastname?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Mobile number'})
        mobilenumber?: string

    @DateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time of the last modification'})
        modify_timestamp?: Date

    @IsBoolean()
    @ApiProperty({description: 'Contact receives the newsletter'})
        newsletter: boolean

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Phone number'})
        phonenumber?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Postal code'})
        postcode?: string

    @IsEnum(ContactStatus)
    @ApiProperty({description: '`active`, or `terminated` once deleted while terminated contracts or subscribers still use it'})
        status: ContactStatus

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Street address'})
        street?: string

    @DateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time of termination'})
        terminate_timestamp?: Date

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Time zone, IANA name such as `Europe/Vienna`'})
        timezone?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'VAT number'})
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
