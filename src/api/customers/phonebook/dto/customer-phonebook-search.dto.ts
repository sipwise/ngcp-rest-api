export class CustomerPhonebookSearchDto {
    name: string = undefined
    customer_id: number = undefined
    number: string = undefined
    own: boolean = undefined
    _alias = {
        id: 'phonebook.id',
        customer_id: 'phonebook.contract_id',
    }
}
