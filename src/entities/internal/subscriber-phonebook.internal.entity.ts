export interface SubscriberPhonebookInterface {
    id?: number
    subscriberId?: number
    name?: string
    number?: string
    shared?: boolean
}

export class SubscriberPhonebook implements SubscriberPhonebookInterface{
    id?: number
    subscriberId!: number
    name!: string
    number!: string
    shared!: boolean

    static create(data: SubscriberPhonebookInterface): SubscriberPhonebook {
        const phonebook = new SubscriberPhonebook()

        Object.keys(data).map(key => {
            phonebook[key] = data[key]
        })
        return phonebook
    }
}