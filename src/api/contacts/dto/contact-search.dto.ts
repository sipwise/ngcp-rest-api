import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {DateTimeField, DateTimeKind} from '~/decorators/date-time-field.decorator'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'
import {dateTimeFilter} from '~/helpers/query-builder.helper'

export class ContactSearchDto {
    @ApiPropertyOptional()
        bankname?: string
    @ApiPropertyOptional()
        bic?: string
    @ApiPropertyOptional()
        city?: string
    @ApiPropertyOptional()
        company?: string
    @ApiPropertyOptional()
        comregnum?: string
    @ApiPropertyOptional()
        country?: string
    @DateTimeField()
    @ApiPropertyOptional()
        create_timestamp: Date // TODO: Set fields on creation
    @ApiPropertyOptional()
        email?: string
    @ApiPropertyOptional()
        faxnumber?: string
    @ApiPropertyOptional()
        firstname?: string
    @ApiPropertyOptional()
        gender?: ContactGender
    @ApiPropertyOptional()
        gpp0?: string
    @ApiPropertyOptional()
        gpp1?: string
    @ApiPropertyOptional()
        gpp2?: string
    @ApiPropertyOptional()
        gpp3?: string
    @ApiPropertyOptional()
        gpp4?: string
    @ApiPropertyOptional()
        gpp5?: string
    @ApiPropertyOptional()
        gpp6?: string
    @ApiPropertyOptional()
        gpp7?: string
    @ApiPropertyOptional()
        gpp8?: string
    @ApiPropertyOptional()
        gpp9?: string
    @ApiPropertyOptional()
        iban?: string
    @ApiPropertyOptional()
        lastname?: string
    @ApiPropertyOptional()
        mobilenumber?: string
    @DateTimeField()
    @ApiPropertyOptional()
        modify_timestamp: Date
    @ApiPropertyOptional()
        newsletter: boolean
    @ApiPropertyOptional()
        phonenumber?: string
    @ApiPropertyOptional()
        postcode?: string
    @ApiPropertyOptional()
        reseller_id?: number
    @ApiPropertyOptional()
        status: ContactStatus
    @ApiPropertyOptional()
        street?: string
    @DateTimeField()
    @ApiPropertyOptional()
        terminate_timestamp?: Date
    @ApiPropertyOptional()
        timezone?: string
    @ApiPropertyOptional()
        vatnum?: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'contact.id',
            create_timestamp: dateTimeFilter(DateTimeKind.DateTime, 'contact.create_timestamp'),
            modify_timestamp: dateTimeFilter(DateTimeKind.DateTime, 'contact.modify_timestamp'),
            terminate_timestamp: dateTimeFilter(DateTimeKind.DateTime, 'contact.terminate_timestamp'),
        }
}