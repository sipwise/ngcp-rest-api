import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'

export class CustomerContactSearchDto {
    @ApiPropertyOptional()
        bankname?: string = undefined
    @ApiPropertyOptional()
        bic?: string = undefined
    @ApiPropertyOptional()
        city?: string = undefined
    @ApiPropertyOptional()
        company?: string = undefined
    @ApiPropertyOptional()
        comregnum?: string = undefined
    @ApiPropertyOptional()
        country?: string = undefined
    @ApiPropertyOptional()
        create_timestamp: Date = undefined
    @ApiPropertyOptional()
        email?: string = undefined
    @ApiPropertyOptional()
        faxnumber?: string = undefined
    @ApiPropertyOptional()
        firstname?: string = undefined
    @ApiPropertyOptional()
        gender?: ContactGender = undefined
    @ApiPropertyOptional()
        gpp0?: string = undefined
    @ApiPropertyOptional()
        gpp1?: string = undefined
    @ApiPropertyOptional()
        gpp2?: string = undefined
    @ApiPropertyOptional()
        gpp3?: string = undefined
    @ApiPropertyOptional()
        gpp4?: string = undefined
    @ApiPropertyOptional()
        gpp5?: string = undefined
    @ApiPropertyOptional()
        gpp6?: string = undefined
    @ApiPropertyOptional()
        gpp7?: string = undefined
    @ApiPropertyOptional()
        gpp8?: string = undefined
    @ApiPropertyOptional()
        gpp9?: string = undefined
    @ApiPropertyOptional()
        iban?: string = undefined
    @ApiPropertyOptional()
        lastname?: string = undefined
    @ApiPropertyOptional()
        mobilenumber?: string = undefined
    @ApiPropertyOptional()
        modify_timestamp: Date = undefined
    @ApiPropertyOptional()
        newsletter: boolean = undefined
    @ApiPropertyOptional()
        phonenumber?: string = undefined
    @ApiPropertyOptional()
        postcode?: string = undefined
    @ApiPropertyOptional()
        reseller_id?: number = undefined
    @ApiPropertyOptional()
        status: ContactStatus = undefined
    @ApiPropertyOptional()
        street?: string = undefined
    @ApiPropertyOptional()
        terminate_timestamp?: Date = undefined
    @ApiPropertyOptional()
        timezone?: string = undefined
    @ApiPropertyOptional()
        vatnum?: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'contact.id',
    }
}
