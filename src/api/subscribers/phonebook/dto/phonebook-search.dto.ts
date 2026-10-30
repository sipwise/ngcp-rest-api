import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class SubscriberPhonebookSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiPropertyOptional()
        customer_id: number
    @ApiPropertyOptional()
        number: string
    @ApiPropertyOptional()
        shared: boolean
    @ApiPropertyOptional()
        own: boolean
    @ApiPropertyOptional()
        purge_existing: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'phonebook.id',
            customer_id: 'subscriber.contract_id',
        }
}
