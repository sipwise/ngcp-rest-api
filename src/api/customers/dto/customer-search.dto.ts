import {
    CustomerBillingProfile,
    CustomerBillingProfileDefiniton,
    CustomerStatus,
    CustomerType,
} from './customer-base.dto'
import {CustomerResponseDto} from './customer-response.dto'

export class CustomerSearchDto implements CustomerResponseDto {
    activate_timestamp: string = undefined
    add_vat: boolean = undefined
    billing_profile_definition: CustomerBillingProfileDefiniton = undefined
    billing_profile_id: number = undefined
    billing_profiles: CustomerBillingProfile[] = undefined
    contact_id?: number = undefined
    create_timestamp: string = undefined
    external_id: string = undefined
    id: number = undefined
    invoice_email_template_id: number = undefined
    invoice_template_id: number = undefined
    max_subscribers: number = undefined
    modify_timestamp: string = undefined
    passreset_email_template_id: number = undefined
    profile_package_id: number = undefined
    status?: CustomerStatus = undefined
    subscriber_email_template_id: number = undefined
    terminate_timestamp: string = undefined
    type?: CustomerType = undefined
    vat_rate: number = undefined
}
