interface BillingMappingInterface {
    billingProfileId: number
    effectiveStartTime?: number
    endDate: Date
    networkId: number
    startDate: Date
}

export class BillingMapping implements BillingMappingInterface {
    billingProfileId: number
    effectiveStartTime?: number
    endDate: Date
    networkId: number
    startDate: Date

    toCSVString(): string {
        const strings: string[] = []
        strings.push(this.startDate != undefined ? this.startDate.toISOString().slice(0, 19).replace('T', ' ') : '')
        strings.push(this.endDate != undefined ? this.endDate.toISOString().slice(0, 19).replace('T', ' ') : '')
        strings.push(this.billingProfileId != undefined ? this.billingProfileId.toString() : '')
        strings.push(this.networkId != undefined ? this.networkId.toString() : '')
        return strings.join(',')
    }

    static create(data: BillingMappingInterface): BillingMapping {
        const billingMapping = new BillingMapping()

        Object.keys(data).map(key => {
            billingMapping[key] = data[key]
        })
        return billingMapping
    }
}
