import {internal} from '../../../entities'

export class SubscriberNumberResponse {
    subscriber_id: number
    number_id: number
    cc: number
    ac: string
    sn: string
    is_primary: boolean
    is_devid: boolean

    constructor(data: internal.SubscriberNumber) {
        this.subscriber_id = data.id
        this.number_id = data.numberID
        this.cc = data.cc
        this.ac = data.ac
        this.sn = data.sn
        this.is_devid = data.isDevID
        this.is_primary = data.isPrimary
    }
}

export class CustomernumberResponseDto {
    id: number
    numbers: SubscriberNumberResponse[]

    constructor(data: internal.CustomerNumber) {
        this.id = data.id
        this.numbers = []
        data.numbers.map(num => {
            this.numbers.push(new SubscriberNumberResponse(num))
        })
    }
}