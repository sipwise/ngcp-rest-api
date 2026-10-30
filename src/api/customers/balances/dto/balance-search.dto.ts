import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerBalanceSearchDto {
    @ApiPropertyOptional()
        customer_id: string
    @ApiPropertyOptional()
        external_id: string
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        contact_id: number
    @ApiPropertyOptional()
        status: string
    @ApiPropertyOptional()
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
