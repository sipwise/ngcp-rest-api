import {ContactGender, ContactStatus} from '../../../entities/internal/contact.internal.entity'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {RbacRole} from '../../../config/constants.config'
import {internal} from '../../../entities'
import {ResponseDto} from '../../../dto/response.dto'
import {Expandable} from '../../../decorators/expandable.decorator'

export class ContactResponseDto implements ResponseDto {
    @ApiProperty()
        id: number
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
        newsletter: boolean
    @ApiPropertyOptional()
        phonenumber?: string
    @ApiPropertyOptional()
        postcode?: string
    @ApiPropertyOptional()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id?: number
    @ApiProperty()
        status: ContactStatus
    @ApiPropertyOptional()
        street?: string
    @ApiPropertyOptional()
        timezone?: string
    @ApiPropertyOptional()
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
