import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {DateTimeField, DateTimeKind} from '~/decorators/date-time-field.decorator'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'
import {dateTimeFilter} from '~/helpers/query-builder.helper'

export class ContactSearchDto {
    @ApiPropertyOptional({description: 'Name of the bank'})
        bankname?: string
    @ApiPropertyOptional({description: 'BIC (Business Identifier Code) of the bank account'})
        bic?: string
    @ApiPropertyOptional({description: 'City'})
        city?: string
    @ApiPropertyOptional({description: 'Company name'})
        company?: string
    @ApiPropertyOptional({description: 'Company registration number'})
        comregnum?: string
    @ApiPropertyOptional({description: 'Two-letter ISO 3166-1 country code, e.g. `US` or `DE`'})
        country?: string
    @DateTimeField()
    @ApiPropertyOptional({description: 'Time of creation'})
        create_timestamp: Date // TODO: Set fields on creation
    @ApiPropertyOptional({description: 'Email address'})
        email?: string
    @ApiPropertyOptional({description: 'Fax number'})
        faxnumber?: string
    @ApiPropertyOptional({description: 'Given name'})
        firstname?: string
    @ApiPropertyOptional({description: '`male` or `female`'})
        gender?: ContactGender
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp0?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp1?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp2?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp3?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp4?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp5?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp6?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp7?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp8?: string
    @ApiPropertyOptional({description: 'General purpose field for free use'})
        gpp9?: string
    @ApiPropertyOptional({description: 'IBAN (International Bank Account Number) of the bank account'})
        iban?: string
    @ApiPropertyOptional({description: 'Surname'})
        lastname?: string
    @ApiPropertyOptional({description: 'Mobile number'})
        mobilenumber?: string
    @DateTimeField()
    @ApiPropertyOptional({description: 'Time of the last modification'})
        modify_timestamp: Date
    @ApiPropertyOptional({description: 'Contact receives the newsletter'})
        newsletter: boolean
    @ApiPropertyOptional({description: 'Phone number'})
        phonenumber?: string
    @ApiPropertyOptional({description: 'Postal code'})
        postcode?: string
    @ApiPropertyOptional({description: 'Reseller of a customer contact; null = system contact, can not be switched between the two'})
        reseller_id?: number
    @ApiPropertyOptional({description: '`active`, or `terminated` once deleted while terminated contracts or subscribers still use it'})
        status: ContactStatus
    @ApiPropertyOptional({description: 'Street address'})
        street?: string
    @DateTimeField()
    @ApiPropertyOptional({description: 'Time of termination'})
        terminate_timestamp?: Date
    @ApiPropertyOptional({description: 'Time zone, IANA name such as `Europe/Vienna`'})
        timezone?: string
    @ApiPropertyOptional({description: 'VAT number'})
        vatnum?: string
    @ApiPropertyOptional({description: 'Id of the contact'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'contact.id',
            create_timestamp: dateTimeFilter(DateTimeKind.DateTime, 'contact.create_timestamp'),
            modify_timestamp: dateTimeFilter(DateTimeKind.DateTime, 'contact.modify_timestamp'),
            terminate_timestamp: dateTimeFilter(DateTimeKind.DateTime, 'contact.terminate_timestamp'),
        }
}