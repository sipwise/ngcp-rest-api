export class CustomerPhonebookSearchDto {
    name: string = undefined
    customer_id: number = undefined
    number: string = undefined
    _alias = {
        customer_id: 'phonebook.contract_id',
    }
}
