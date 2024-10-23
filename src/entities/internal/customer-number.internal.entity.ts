import {VoipNumber} from '~/entities/internal/voip-number.internal.entity'

export interface CustomerNumberInternalEntity {
    id: number
    numbers: VoipNumber[]
}

export class CustomerNumber implements CustomerNumberInternalEntity {
    id: number
    numbers: VoipNumber[]

    static create(data: CustomerNumberInternalEntity): CustomerNumber {
        const contract = new CustomerNumber()

        Object.keys(data).map(key => {
            contract[key] = data[key]
        })
        return contract
    }
}