export enum BillingProfileStatus {
    Active = 'active',
    Terminated = 'terminated'
}

export enum PrepaidLibrary {
    LibswRate = 'libswrate',
}
export enum IntervalUnit {
    Week = 'week',
    Month = 'month'
}

interface BillingProfileInterface {
    id?: number
    resellerId?: number
    handle: string
    name: string
    prepaid?: boolean
    intervalCharge?: number
    intervalFreeTime?: number
    intervalFreeCash?: number
    intervalUnit?: IntervalUnit
    intervalCount?: boolean
    fraudIntervalLimit?: number
    fraudIntervalLock?: boolean
    fraudIntervalNotify?: string
    fraudDailyLimit?: number
    fraudDailyLock?: boolean
    fraudDailyNotify?: string
    fraudUseResellerRates?: boolean
    currency?: string
    status: BillingProfileStatus
    modifyTimestamp?: Date
    createTimestamp?: Date
    terminateTimestamp?: Date
    adviceOfCharge?: boolean
    prepaidLibrary: PrepaidLibrary
    ignoreDomain?: boolean
}

export class BillingProfile implements BillingProfileInterface {
    id?: number
    resellerId?: number
    handle: string
    name: string
    prepaid?: boolean
    intervalCharge?: number
    intervalFreeTime?: number
    intervalFreeCash?: number
    intervalUnit?: IntervalUnit
    intervalCount?: boolean
    fraudIntervalLimit?: number
    fraudIntervalLock?: boolean
    fraudIntervalNotify?: string
    fraudDailyLimit?: number
    fraudDailyLock?: boolean
    fraudDailyNotify?: string
    fraudUseResellerRates?: boolean
    currency?: string
    status: BillingProfileStatus
    modifyTimestamp?: Date
    createTimestamp?: Date
    terminateTimestamp?: Date
    adviceOfCharge?: boolean
    prepaidLibrary: PrepaidLibrary
    ignoreDomain?: boolean

    static create(data: BillingProfileInterface): BillingProfile {
        const billingProfile = new BillingProfile()

        Object.keys(data).map(key => {
            billingProfile[key] = data[key]
        })
        return billingProfile
    }
}
