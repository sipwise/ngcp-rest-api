import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class CustomerSearchDto {
    add_vat: boolean = undefined
    billing_profile_definition: ContractBillingProfileDefinition = undefined
    billing_profile_id: number = undefined
    contact_id?: number = undefined
    external_id: string = undefined
    invoice_email_template_id?: number = undefined
    invoice_template_id?: number = undefined
    max_subscribers?: number = undefined
    passreset_email_template_id?: number = undefined
    profile_package_id?: number = undefined
    status?: ContractStatus = undefined
    subscriber_email_template_id?: number = undefined
    type?: ContractType = undefined
    vat_rate?: number = undefined
    _alias = {
        id: 'contract.id',
    }
}
