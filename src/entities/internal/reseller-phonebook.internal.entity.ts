export interface ResellerPhonebookInterface {
    id?: number
    resellerId?: number
    name?: string
    number?: string
}

export class ResellerPhonebook implements ResellerPhonebookInterface{
    id?: number
    resellerId!: number
    name!: string
    number!: string

    static create(data: ResellerPhonebookInterface): ResellerPhonebook {
        const phonebook = new ResellerPhonebook()

        Object.keys(data).map(key => {
            phonebook[key] = data[key]
        })
        return phonebook
    }
}