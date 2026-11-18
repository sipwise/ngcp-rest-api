import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class CustomerSearchDto {
    @ApiPropertyOptional({description: 'VAT is added on invoices'})
        add_vat: boolean
    @ApiPropertyOptional({description: 'How the billing profiles were set: `id`, `profiles` or `package`'})
        billing_profile_definition: ContractBillingProfileDefinition
    @ApiPropertyOptional({description: 'Billing profile currently charging the customer'})
        billing_profile_id: number
    @ApiPropertyOptional({description: 'Contact of the customer'})
        contact_id?: number
    @ApiPropertyOptional({description: 'Non-unique external id, e.g. from third-party provisioning'})
        external_id: string
    @ApiPropertyOptional({description: 'Email template used to notify users about invoices'})
        invoice_email_template_id?: number
    @ApiPropertyOptional({description: 'Invoice template; null = no invoices are generated'})
        invoice_template_id?: number
    @ApiPropertyOptional({description: 'Maximum number of subscribers; null = unlimited'})
        max_subscribers?: number
    @ApiPropertyOptional({description: 'Email template used to notify users about password resets'})
        passreset_email_template_id?: number
    @ApiPropertyOptional({description: 'Profile package whose initial profiles charge the customer'})
        profile_package_id?: number
    @ApiPropertyOptional({description: 'State of the customer'})
        status?: ContractStatus
    @ApiPropertyOptional({description: 'Email template used to notify users about subscriber creation'})
        subscriber_email_template_id?: number
    @ApiPropertyOptional({description: '`sipaccount` for SIP customers, `pbxaccount` for Cloud PBX customers'})
        type?: ContractType
    @ApiPropertyOptional({description: 'VAT rate in percent, e.g. 20'})
        vat_rate?: number
    @ApiPropertyOptional({description: 'Id of the customer'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'contract.id',
        }
}
