import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerPhonebookSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        customer_id: number = undefined
    @ApiPropertyOptional()
        number: string = undefined
    @ApiPropertyOptional()
        own: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'phonebook.id',
        customer_id: 'phonebook.contract_id',
    }
}
