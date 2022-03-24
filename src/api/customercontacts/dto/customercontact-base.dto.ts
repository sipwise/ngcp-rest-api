// TODO: Check which fields are optional/required
import {ContactGender, ContactStatus} from '../../../entities/db/billing/contact.mariadb.entity'

export class CustomercontactBaseDto {
    bankname?: string
    bic?: string
    city?: string
    company?: string
    comregnum?: string
    country?: string
    create_timestamp: Date // TODO: Set fields on creation
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
    modify_timestamp: Date
    newsletter: boolean
    phonenumber?: string
    postcode?: string
    reseller_id?: number
    status: ContactStatus
    street?: string
    terminate_timestamp?: Date
    timezone?: string
    vatnum?: string
}
