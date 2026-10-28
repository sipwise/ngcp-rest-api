import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsDate, IsEnum, IsInt, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class ContactResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

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
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time of creation, null if unknown'})
        create_timestamp?: Date

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
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time of the last modification'})
        modify_timestamp?: Date

    @IsBoolean()
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
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id?: number

    @IsEnum(ContactStatus)
    @ApiProperty()
        status: ContactStatus

    @CanBeNull()
    @IsString()
    @ApiProperty()
        street?: string

    @CanBeNull()
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time of termination'})
        terminate_timestamp?: Date

    @CanBeNull()
    @IsString()
    @ApiProperty()
        timezone?: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        vatnum?: string

    constructor(contact: internal.Contact, role: RbacRole, options?: ResponseDtoOptions) {
        super(options)
        Object.keys(contact).map(key => {
            this[key] = contact[key]
        })

        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role)) {
            this.reseller_id = contact.reseller_id
        } else {
            this.reseller_id = null
        }
    }
}
