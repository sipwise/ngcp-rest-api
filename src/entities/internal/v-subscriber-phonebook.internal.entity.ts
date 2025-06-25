export interface VSubscriberPhonebookInterface {
    id?: string
    subscriberId?: number
    customerId?: number
    name?: string
    number?: string
    shared?: boolean
    own?: boolean
}

export class VSubscriberPhonebook implements VSubscriberPhonebookInterface{
    id?: string
    subscriberId!: number
    customerId?: number
    name!: string
    number!: string
    shared: boolean
    own: boolean

    static create(data: VSubscriberPhonebookInterface): VSubscriberPhonebook {
        const phonebook = new VSubscriberPhonebook()

        Object.keys(data).map(key => {
            phonebook[key] = data[key]
        })
        return phonebook
    }
}