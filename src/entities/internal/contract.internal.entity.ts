export enum ContractType {
    SipPeering = 'sippeering',
    Reseller = 'reseller'
}

export enum ContractStatus {
    Pending = 'pending',
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

export enum ContractBillingProfileDefinition {
    ID = 'id',
    Profiles = 'profiles',
    Package = 'package'
}

interface ContractInternalEntity {
    id?: number
    activate_timestamp?: Date
    add_vat?: boolean
    billing_profile_definition?: ContractBillingProfileDefinition
    billing_profile_id?: number
    contact_id?: number
    create_timestamp?: Date
    customer_id?: number
    external_id?: string
    invoice_email_template_id?: number
    invoice_template_id?: number
    max_subscribers?: number
    modify_timestamp?: Date
    order_id?: number
    passreset_email_template_id?: number
    product_id?: number
    profile_package_id?: number
    send_invoice?: boolean
    status: ContractStatus
    subscriber_email_template_id?: number
    terminate_timestamp?: Date
    type?: ContractType
    vat_rate?: boolean
}

export class Contract implements ContractInternalEntity {
    id?: number
    activate_timestamp?: Date
    add_vat: boolean
    billing_profile_definition: ContractBillingProfileDefinition
    billing_profile_id: number
    contact_id?: number
    create_timestamp?: Date
    customer_id?: number
    external_id?: string
    invoice_email_template_id?: number
    invoice_template_id?: number
    max_subscribers?: number
    modify_timestamp?: Date
    order_id?: number
    passreset_email_template_id?: number
    product_id: number
    profile_package_id?: number
    send_invoice: boolean
    status: ContractStatus
    subscriber_email_template_id?: number
    terminate_timestamp?: Date
    type: ContractType
    vat_rate: boolean

    static create(data: ContractInternalEntity): Contract {
        const contract = new Contract()

        Object.keys(data).map(key => {
            contract[key] = data[key]
        })
        return contract
    }

}