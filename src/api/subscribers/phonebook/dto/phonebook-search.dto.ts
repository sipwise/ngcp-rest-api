import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class SubscriberPhonebookSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiPropertyOptional()
        customer_id: number = undefined
    @ApiPropertyOptional()
        number: string = undefined
    @ApiPropertyOptional()
        shared: boolean = undefined
    @ApiPropertyOptional()
        own: boolean = undefined
    @ApiPropertyOptional()
        purge_existing: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'phonebook.id',
        customer_id: 'subscriber.contract_id',
    }
}
