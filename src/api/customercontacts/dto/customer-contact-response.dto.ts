import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsInt, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'



export class CustomerContactResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id!: number

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

    @CanBeNull()
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

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        reseller_id?: number

    @CanBeNull()
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

    constructor(contact: internal.Contact, role: RbacRole) {
        Object.keys(contact).map(key => {
            this[key] = contact[key]
        })

        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role)) {
            this.reseller_id = contact.reseller_id
        } else {
            delete(this.reseller_id)
        }
    }
}
