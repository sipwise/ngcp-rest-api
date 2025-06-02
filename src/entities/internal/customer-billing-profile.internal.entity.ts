interface CustomerBillingProfileInterface {
    id: number
    effectiveStartTime?: Date
    endDate: Date
    networkId: number
    startDate: Date
}

export class CustomerBillingProfile implements CustomerBillingProfileInterface {
    id: number
    effectiveStartTime?: Date
    endDate: Date
    networkId: number
    startDate: Date

    static create(data: CustomerBillingProfileInterface): CustomerBillingProfile {
        const billingMapping = new CustomerBillingProfile()

        Object.keys(data).map(key => {
            billingMapping[key] = data[key]
        })
        return billingMapping
    }
}
