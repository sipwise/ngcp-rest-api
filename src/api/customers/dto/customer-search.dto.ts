import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class CustomerSearchDto {
    @ApiPropertyOptional()
        add_vat: boolean
    @ApiPropertyOptional()
        billing_profile_definition: ContractBillingProfileDefinition
    @ApiPropertyOptional()
        billing_profile_id: number
    @ApiPropertyOptional()
        contact_id?: number
    @ApiPropertyOptional()
        external_id: string
    @ApiPropertyOptional()
        invoice_email_template_id?: number
    @ApiPropertyOptional()
        invoice_template_id?: number
    @ApiPropertyOptional()
        max_subscribers?: number
    @ApiPropertyOptional()
        passreset_email_template_id?: number
    @ApiPropertyOptional()
        profile_package_id?: number
    @ApiPropertyOptional()
        status?: ContractStatus
    @ApiPropertyOptional()
        subscriber_email_template_id?: number
    @ApiPropertyOptional()
        type?: ContractType
    @ApiPropertyOptional()
        vat_rate?: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'contract.id',
        }
}
