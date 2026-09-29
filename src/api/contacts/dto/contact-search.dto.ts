import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'

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
    @ApiPropertyOptional()
        terminate_timestamp?: Date
    @ApiPropertyOptional()
        timezone?: string
    @ApiPropertyOptional()
        vatnum?: string
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'contact.id',
    }
}