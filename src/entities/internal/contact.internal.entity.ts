export enum ContactStatus {
    Active = 'active',
    Terminated = 'terminated'
}

export enum ContactGender {
    Male = 'male',
    Female = 'female'
}

export enum ContactType {
    CustomerContact,
    SystemContact
}

export interface ContactInternalEntity {
    id?: number
    reseller_id?: number
    gender?: ContactGender
    firstname?: string
    lastname?: string
    comregnum?: string
    company?: string
    street?: string
    postcode?: string
    city?: string
    country?: string
    phonenumber?: string
    mobilenumber?: string
    email?: string
    newsletter?: boolean
    modify_timestamp?: Date
    create_timestamp?: Date
    faxnumber?: string
    iban?: string
    bic?: string
    vatnum?: string
    bankname?: string
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
    status?: ContactStatus
    terminate_timestamp?: Date
    timezone?: string
}

export class Contact implements ContactInternalEntity {
    bankname: string
    bic: string
    city: string
    company: string
    comregnum: string
    country: string
    create_timestamp: Date
    email: string
    faxnumber: string
    firstname: string
    gender: ContactGender
    gpp0: string
    gpp1: string
    gpp2: string
    gpp3: string
    gpp4: string
    gpp5: string
    gpp6: string
    gpp7: string
    gpp8: string
    gpp9: string
    iban: string
    id: number
    lastname: string
    mobilenumber: string
    modify_timestamp: Date
    newsletter: boolean
    phonenumber: string
    postcode: string
    reseller_id: number
    status: ContactStatus
    street: string
    terminate_timestamp: Date
    timezone: string
    vatnum: string

    static create(data: ContactInternalEntity): Contact {
        const contact = new Contact()

        Object.keys(data).map(key => {
            contact[key] = data[key]
        })
        return contact
    }
}