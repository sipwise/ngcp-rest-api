import {ContactGender, ContactStatus} from '~/entities/internal/contact.internal.entity'

export class CustomerContactSearchDto {
    bankname?: string = undefined
    bic?: string = undefined
    city?: string = undefined
    company?: string = undefined
    comregnum?: string = undefined
    country?: string = undefined
    create_timestamp: Date = undefined
    email?: string = undefined
    faxnumber?: string = undefined
    firstname?: string = undefined
    gender?: ContactGender = undefined
    gpp0?: string = undefined
    gpp1?: string = undefined
    gpp2?: string = undefined
    gpp3?: string = undefined
    gpp4?: string = undefined
    gpp5?: string = undefined
    gpp6?: string = undefined
    gpp7?: string = undefined
    gpp8?: string = undefined
    gpp9?: string = undefined
    iban?: string = undefined
    lastname?: string = undefined
    mobilenumber?: string = undefined
    modify_timestamp: Date = undefined
    newsletter: boolean = undefined
    phonenumber?: string = undefined
    postcode?: string = undefined
    reseller_id?: number = undefined
    status: ContactStatus = undefined
    street?: string = undefined
    terminate_timestamp?: Date = undefined
    timezone?: string = undefined
    vatnum?: string = undefined
    _alias = {
        id: 'contact.id',
    }
}
