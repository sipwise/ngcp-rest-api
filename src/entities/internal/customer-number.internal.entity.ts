export class SubscriberNumber {
    id: number
    cc: number
    ac: string
    sn: string
    isPrimary: boolean
    isDevID: boolean
    numberID: number
}

export interface CustomerNumberInternalEntity {
    id: number
    numbers: SubscriberNumber[]
}

export class CustomerNumber implements CustomerNumberInternalEntity {
    id: number
    numbers: SubscriberNumber[]

    static create(data: CustomerNumberInternalEntity): CustomerNumber {
        const contract = new CustomerNumber()

        Object.keys(data).map(key => {
            contract[key] = data[key]
        })
        return contract
    }
}