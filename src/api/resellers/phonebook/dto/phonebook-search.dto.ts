import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class ResellerPhonebookSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        number: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'phonebook.id',
        }
}
