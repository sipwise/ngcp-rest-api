import {ProductClass} from './product.internal.entity'
import {VoipSubscriberStatus} from './voip-subscriber.internal.entity'

import {LazyCounts} from '~/interfaces/lazy-field-source.interface'

export enum SubscriberPbxHuntPolicy {
    Serial = 'serial',
    Parallel = 'parallel',
    Random = 'random',
    Circular = 'circular',
    None = 'none',
}

export enum SubscriberPbxHuntCancelMode {
    Bye = 'bye',
    Cancel = 'cancel',
}

export interface SubscriberNumber {
    numberId?: number
    cc: number
    ac: string
    sn: string
}

export interface SubscriberAliasNumber extends SubscriberNumber {
    isDevId: boolean
}

/**
 * Subscriber merged from its billing and provisioning rows, numbers, preferences and pbx groups. The lists
 * aliasNumbers, pbxGroupIds and pbxGroupmemberIds are lazy fields: undefined when a read did not load them, their
 * counts in lazyCounts.
 */
export class Subscriber {
    id: number
    provisioningId?: number
    provisioningDomainId?: number
    uuid: string
    customerId: number
    customerProductClass?: ProductClass
    resellerId?: number
    contactId?: number | null
    username: string
    domain: string
    domainId: number
    status: VoipSubscriberStatus
    lock: string | null
    externalId: string | null
    email: string | null
    timezone: string | null
    webusername: string | null
    password?: string
    webpassword?: string
    administrative: boolean
    profileSetId: number | null
    profileId: number | null
    primaryNumber: SubscriberNumber | null
    aliasNumbers: SubscriberAliasNumber[]
    displayName: string | null
    isPbxPilot: boolean
    isPbxGroup: boolean
    pbxExtension: string | null
    pbxHuntPolicy: SubscriberPbxHuntPolicy | null
    pbxHuntTimeout: number | null
    pbxHuntCancelMode: SubscriberPbxHuntCancelMode | null
    pbxGroupIds: number[]
    pbxGroupmemberIds: number[]
    lazyCounts?: LazyCounts
    extRangeMin: number | null
    extRangeMax: number | null
    createTimestamp: Date
    modifyTimestamp: Date
    passwordModifyTimestamp?: Date
    webpasswordModifyTimestamp?: Date

    get isPbxAccount(): boolean {
        return this.customerProductClass == ProductClass.PbxAccount
    }
}
