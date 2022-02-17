export enum CustomerStatus {
    Active = 'active',
    Pending = 'pending',
    Locked = 'locked',
    Terminated = 'terminated'
}

export enum CustomerType {
    SipAccount = 'sippacount',
    PbxAccount = 'pbxaccount'
}

export enum CustomerBillingProfileDefiniton {
    Id = 'id',
    Profiles = 'profiles',
    Package = 'package',
}

export class CustomerBillingProfile {
    network_id: number
    profile_id?: number
    start!: string // TODO: why is timestamp not a date?; why is it required field in DTO?
    stop: string // TODO: why is timestamp not a date?; why is it required field in DTO?
}

export class CustomerBaseDto {
    activate_timestamp!: string // TODO: why is timestamp not a date?; why is it required field in DTO?
    add_vat!: boolean
    billing_profile_definition!: CustomerBillingProfileDefiniton
    billing_profile_id!: number
    billing_profiles!: CustomerBillingProfile[]
    contact_id?: number
    create_timestamp!: string //TODO: why is timestamp not a date?; why is it required field in DTO?
    external_id!: string
    invoice_email_template_id!: number
    invoice_template_id!: number
    max_subscribers!: number // TODO v1 api says it is optional though required
    modify_timestamp!: string //TODO: why is timestamp not a date?; why is it required field in DTO?
    passreset_email_template_id!: number
    profile_package_id!: number
    status?: CustomerStatus
    subscriber_email_template_id!: number
    terminate_timestamp!: string //TODO: why is timestamp not a date?; why is it required field in DTO?
    type?: CustomerType // TODO: this is not an enum in v1
    vat_rate!: number
}
