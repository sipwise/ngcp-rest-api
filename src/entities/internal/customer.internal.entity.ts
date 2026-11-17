import {
    ContractBillingProfileDefinition,
    ContractStatus as CustomerStatus,
} from './contract.internal.entity'

import {internal} from '~/entities'
import {LazyCounts} from '~/interfaces/lazy-field-source.interface'

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
    ownerTimezone?: string
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
    // requested schedule on writes; on reads the schedule, undefined when not loaded (lazy, not inlined)
    billingProfiles?: internal.CustomerBillingProfile[]
    futureBillingProfiles?: internal.CustomerBillingProfile[]
    lazyCounts?: LazyCounts
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
    ownerTimezone?: string
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
