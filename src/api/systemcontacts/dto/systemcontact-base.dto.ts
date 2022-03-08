// TODO: Check which fields are optional/required

// TODO: maybe it would be better to have CreateDto and BaseDto extends the Create, else we have
//  partial inheritance problems as we previously did

// TODO: add input validation; according to v1 API definition all fields are required; not sure if that is correct
import {IsEmail} from 'class-validator'
import {ContactGender, ContactStatus} from '../../../entities/db/billing/contact.entity'

export class SystemcontactBaseDto {
    bankname?: string
    bic?: string
    city?: string
    company?: string
    comregnum?: string
    country?: string

    @IsEmail()
        email?: string
    faxnumber?: string
    firstname?: string
    gender?: ContactGender
    gpp0?: string
    gpp1?: string
    gpp2?: string
    gpp3?: string
    gpp4?: string
    gpp5?: string
    gpp6?: string
    gpp7?: string
    gpp8?: string
    gpp9?: string
    iban?: string
    lastname?: string
    mobilenumber?: string
    newsletter: boolean
    phonenumber?: string
    postcode?: string
    reseller_id?: number // TODO: remove reseller_id from BaseDto?
    status: ContactStatus
    street?: string
    timezone?: string
    vatnum?: string

}
