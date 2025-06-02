import {
    ContractBillingProfileDefinition,
    ContractStatus as CustomerStatus,
} from './contract.internal.entity'

import {internal} from '~/entities'

export enum CustomerType {
    SipAccount = 'sipaccount',
    PbxAccount = 'pbxaccount',
}

interface CustomerInternalEntity {
    activateTimestamp?: Date
    addVat?: boolean
    billingProfileDefinition?: ContractBillingProfileDefinition
    billingProfiles?: internal.CustomerBillingProfile[]
    billingProfileId?: number
    contactId?: number
    createTimestamp?: Date
    customerId?: number
    externalId?: string
    futureMappings?: internal.BillingMapping[]
    allBillingMappings?: internal.BillingMapping[]
    id?: number
    invoiceEmailTemplateId?: number
    invoiceTemplateId?: number
    maxSubscribers?: number
    modifyTimestamp?: Date
    orderId?: number
    passresetEmailTemplateId?: number
    productId?: number
    profilePackageId?: number
    sendInvoice?: boolean
    status: CustomerStatus
    subscriberEmailTemplateId?: number
    terminateTimestamp?: Date
    type?: CustomerType
    vatRate?: number
    createBillingMappings?: internal.BillingMapping[]
}

export class Customer implements CustomerInternalEntity {
    activateTimestamp?: Date
    addVat?: boolean
    billingProfileDefinition?: ContractBillingProfileDefinition
    billingProfiles?: internal.CustomerBillingProfile[]
    billingProfileId?: number
    contactId?: number
    createTimestamp?: Date
    customerId?: number
    externalId?: string
    futureMappings?: internal.BillingMapping[]
    allBillingMappings?: internal.BillingMapping[]
    id?: number
    invoiceEmailTemplateId?: number
    invoiceTemplateId?: number
    maxSubscribers?: number
    modifyTimestamp?: Date
    orderId?: number
    passresetEmailTemplateId?: number
    productId?: number
    profilePackageId?: number
    sendInvoice?: boolean
    status: CustomerStatus
    subscriberEmailTemplateId?: number
    terminateTimestamp?: Date
    type?: CustomerType
    vatRate?: number
    createBillingMappings?: internal.BillingMapping[]

    static create(data: CustomerInternalEntity): Customer {
        const customer = new Customer()
        Object.keys(data).map(key => {
            customer[key] = data[key]
        })
        return customer
    }
}
