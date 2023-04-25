import {ContactGender, ContactStatus} from '../../../entities/internal/contact.internal.entity'
import {internal} from '../../../entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator'

export class CustomerContactCreateDto {
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

    @IsOptional()
    @ApiPropertyOptional()
        reseller_id?: number

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

    toInternal(id?: number) {
        const contact = internal.Contact.create(this)
        if (id)
            contact.id = id
        return contact
    }
}
