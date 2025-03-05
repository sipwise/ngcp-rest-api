export interface VCustomerPhonebookInterface {
    id?: string
    contractId?: number
    name?: string
    number?: string
}

export class VCustomerPhonebook implements VCustomerPhonebookInterface{
    id?: string
    contractId!: number
    name!: string
    number!: string

    static create(data: VCustomerPhonebookInterface): VCustomerPhonebook {
        const phonebook = new VCustomerPhonebook()

        Object.keys(data).map(key => {
            phonebook[key] = data[key]
        })
        return phonebook
    }
}