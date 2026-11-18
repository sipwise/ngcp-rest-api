import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerBalanceSearchDto {
    @ApiPropertyOptional({description: 'Customer of the balance'})
        customer_id: string
    @ApiPropertyOptional({description: 'External id of the customer'})
        external_id: string
    @ApiPropertyOptional({description: 'Reseller of the customer'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Contact of the customer'})
        contact_id: number
    @ApiPropertyOptional({description: 'State of the customer'})
        status: string
    @ApiPropertyOptional({description: 'Id of the customer balance'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'customerBalance.id',
            customer_id: 'customerBalance.contract_id',
            external_id: 'contract.external_id',
            reseller_id: 'contact.reseller_id',
            contact_id: 'contact.id',
            status: 'contract.status',
        }
}
