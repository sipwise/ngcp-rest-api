import {
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
    allBillingMappings?: internal.BillingMapping[]
    billingProfileId?: number
    contactId?: number
    createTimestamp?: Date
    customerId?: number
    externalId?: string
    futureMappings?: internal.BillingMapping[]
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
}

export class Customer implements CustomerInternalEntity {
    activateTimestamp?: Date
    addVat: boolean
    allBillingMappings: internal.BillingMapping[]
    billingProfileId: number
    contactId?: number
    createTimestamp?: Date
    customerId?: number
    externalId?: string
    futureMappings?: internal.BillingMapping[]
    id?: number
    invoiceEmailTemplateId?: number
    invoiceTemplateId?: number
    maxSubscribers?: number
    modifyTimestamp?: Date
    orderId?: number
    passresetEmailTemplateId?: number
    productId: number
    profilePackageId?: number
    sendInvoice: boolean
    status: CustomerStatus
    subscriberEmailTemplateId?: number
    terminateTimestamp?: Date
    type: CustomerType
    vatRate: number

    static create(data: CustomerInternalEntity): Customer {
        const contract = new Customer()

        Object.keys(data).map(key => {
            contract[key] = data[key]
        })
        return contract
    }

}
