interface SubscriberNumberInternalEntity {
    id: number
    cc: number
    ac: string
    sn: string
    isPrimary: boolean
    isDevID: boolean
    numberID: number
}

export class SubscriberNumber implements SubscriberNumberInternalEntity {
    id: number
    cc: number
    ac: string
    sn: string
    isPrimary: boolean
    isDevID: boolean
    numberID: number

    static create(data: SubscriberNumberInternalEntity): SubscriberNumber {
        const sub = new SubscriberNumber()

        Object.keys(data).map(key => {
            sub[key] = data[key]
        })
        return sub
    }
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