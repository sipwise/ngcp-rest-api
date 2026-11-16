interface BillingMappingInterface {
    billingProfileId: number
    effectiveStartTime?: number
    endDate?: Date
    networkId?: number
    startDate?: Date
}

export class BillingMapping implements BillingMappingInterface {
    billingProfileId: number
    effectiveStartTime?: number
    endDate?: Date
    networkId?: number
    startDate?: Date

    static create(data: BillingMappingInterface): BillingMapping {
        const mapping = new BillingMapping()
        Object.keys(data).map(key => {
            mapping[key] = data[key]
        })
        return mapping
    }
}
