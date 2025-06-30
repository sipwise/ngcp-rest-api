export class SubscriberPhonebookSearchDto {
    name: string = undefined
    subscriber_id: number = undefined
    customer_id: number = undefined
    number: string = undefined
    shared: boolean = undefined
    own: boolean = undefined
    _alias = {
        id: 'phonebook.id',
        customer_id: 'subscriber.contract_id',
    }
}
