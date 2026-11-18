import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerPhonebookSearchDto {
    @ApiPropertyOptional({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string
    @ApiPropertyOptional({description: 'Customer owning the entry'})
        customer_id: number
    @ApiPropertyOptional({description: 'Phone number or SIP URI'})
        number: string
    @ApiPropertyOptional({description: 'Entry belongs to the customer, not to its reseller'})
        own: boolean
    @ApiPropertyOptional({description: 'Id of the phonebook entry'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'phonebook.id',
            customer_id: 'phonebook.contract_id',
        }
}
