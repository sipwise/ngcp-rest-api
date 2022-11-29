import {internal} from '../../../entities'
import {RbacRole} from '../../../config/constants.config'

export class NumberResponseDto {
    subscriber_id: number
    id: number
    customer_id: number
    cc: number
    ac: string
    sn: string
    is_primary: boolean
    is_devid: boolean
    reseller_id: number

    constructor(data: internal.VoipNumber, role: RbacRole) {
        this.subscriber_id = data.subscriberID
        this.id = data.id
        this.customer_id = data.contractID
        this.cc = data.cc
        this.ac = data.ac
        this.sn = data.sn
        this.is_devid = data.isDevID
        this.is_primary = data.isPrimary
        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role))
            this.reseller_id = data.resellerID
    }
}