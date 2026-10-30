import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerPhonebookSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        customer_id: number
    @ApiPropertyOptional()
        number: string
    @ApiPropertyOptional()
        own: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'phonebook.id',
            customer_id: 'phonebook.contract_id',
        }
}
