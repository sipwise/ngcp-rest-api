import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerBalanceSearchDto {
    @ApiPropertyOptional()
        customer_id: string = undefined
    @ApiPropertyOptional()
        external_id: string = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        contact_id: number = undefined
    @ApiPropertyOptional()
        status: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
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
