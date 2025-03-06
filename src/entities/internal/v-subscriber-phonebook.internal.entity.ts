export interface VSubscriberPhonebookInterface {
    id?: string
    subscriberId?: number
    name?: string
    number?: string
    shared?: boolean
}

export class VSubscriberPhonebook implements VSubscriberPhonebookInterface{
    id?: string
    subscriberId!: number
    name!: string
    number!: string
    shared: boolean

    static create(data: VSubscriberPhonebookInterface): VSubscriberPhonebook {
        const phonebook = new VSubscriberPhonebook()

        Object.keys(data).map(key => {
            phonebook[key] = data[key]
        })
        return phonebook
    }
}