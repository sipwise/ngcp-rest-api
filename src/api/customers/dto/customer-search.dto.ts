import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class CustomerSearchDto {
    @ApiPropertyOptional()
        add_vat: boolean = undefined
    @ApiPropertyOptional()
        billing_profile_definition: ContractBillingProfileDefinition = undefined
    @ApiPropertyOptional()
        billing_profile_id: number = undefined
    @ApiPropertyOptional()
        contact_id?: number = undefined
    @ApiPropertyOptional()
        external_id: string = undefined
    @ApiPropertyOptional()
        invoice_email_template_id?: number = undefined
    @ApiPropertyOptional()
        invoice_template_id?: number = undefined
    @ApiPropertyOptional()
        max_subscribers?: number = undefined
    @ApiPropertyOptional()
        passreset_email_template_id?: number = undefined
    @ApiPropertyOptional()
        profile_package_id?: number = undefined
    @ApiPropertyOptional()
        status?: ContractStatus = undefined
    @ApiPropertyOptional()
        subscriber_email_template_id?: number = undefined
    @ApiPropertyOptional()
        type?: ContractType = undefined
    @ApiPropertyOptional()
        vat_rate?: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'contract.id',
    }
}
