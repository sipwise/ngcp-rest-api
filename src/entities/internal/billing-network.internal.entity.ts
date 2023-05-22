import {Reseller} from '../db/billing'
import {AdminInterface} from './admin.internal.entity'

export enum BillingNetworkStatus {
    Active = 'active',
    Terminated = 'terminated'
}

interface BillingNetworkInterface {
    id?: number
    resellerId?: number
    name: string
    description: string
    status: BillingNetworkStatus
    reseller?: Reseller
}

export class BillingNetwork implements BillingNetworkInterface {
    id?: number
    resellerId?: number
    name: string
    description: string
    status: BillingNetworkStatus
    reseller: Reseller

    static create(data: BillingNetworkInterface): BillingNetwork {
        const billingNetwork = new BillingNetwork()

        Object.keys(data).map(key => {
            billingNetwork[key] = data[key]
        })
        return billingNetwork
    }
}
