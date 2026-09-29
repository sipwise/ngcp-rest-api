import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class ResellerPhonebookSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        number: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'phonebook.id',
    }
}
