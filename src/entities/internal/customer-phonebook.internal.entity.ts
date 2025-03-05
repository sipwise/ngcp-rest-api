export interface CustomerPhonebookInterface {
    id?: number
    contractId?: number
    name?: string
    number?: string
}

export class CustomerPhonebook implements CustomerPhonebookInterface{
    id?: number
    contractId!: number
    name!: string
    number!: string

    static create(data: CustomerPhonebookInterface): CustomerPhonebook {
        const phonebook = new CustomerPhonebook()

        Object.keys(data).map(key => {
            phonebook[key] = data[key]
        })
        return phonebook
    }
}