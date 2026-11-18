import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class ResellerPhonebookSearchDto {
    @ApiPropertyOptional({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string
    @ApiPropertyOptional({description: 'Reseller owning the entry; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Phone number or SIP URI'})
        number: string
    @ApiPropertyOptional({description: 'Id of the phonebook entry'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'phonebook.id',
        }
}
