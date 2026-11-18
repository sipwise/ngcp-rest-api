import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class SubscriberPhonebookSearchDto {
    @ApiPropertyOptional({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string
    @ApiPropertyOptional({description: 'Subscriber owning the entry'})
        subscriber_id: number
    @ApiPropertyOptional({description: 'Customer of the subscriber owning the entry'})
        customer_id: number
    @ApiPropertyOptional({description: 'Phone number or SIP URI'})
        number: string
    @ApiPropertyOptional({description: 'Entry is visible to the other subscribers of the customer'})
        shared: boolean
    @ApiPropertyOptional({description: 'Entry belongs to the subscriber, not to its customer or reseller'})
        own: boolean
    @ApiPropertyOptional({description: 'CSV import: delete the existing entries of the imported subscribers first'})
        purge_existing: boolean
    @ApiPropertyOptional({description: 'Id of the phonebook entry'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'phonebook.id',
            customer_id: 'subscriber.contract_id',
        }
}
