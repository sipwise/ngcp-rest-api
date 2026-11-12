import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {SubscriberNumber} from '~/entities/internal/subscriber.internal.entity'
import {ServiceRequest} from '~/interfaces/service-request.interface'

/**
 * Subscribers a read is limited to, set by the service from the caller's role; empty = all subscribers
 */
export interface SubscriberScope {
    resellerId?: number
    customerId?: number
    subscriberId?: number
}

export interface SubscriberCustomer {
    id: number
    productClass: ProductClass
    externalId: string | null
    maxSubscribers: number | null
    resellerId: number
    resellerContractId: number
    resellerMaxSubscribers: number | null
    extRangeMin: number | null
    extRangeMax: number | null
    soundSetId: number | null
}

export interface SubscriberDomain {
    id: number
    domain: string
    resellerId: number | null
    provisioningId: number
}

export interface SubscriberNumberRow extends SubscriberNumber {
    id: number
    subscriberId: number | null
}

export interface SubscriberProfileRow {
    id: number
    setId: number
    setDefault: boolean
}

export interface SubscriberRef {
    id: number
    provisioningId: number
    /** `sip:username@domain` */
    uri: string
}

export interface SubscriberNumberAssignment {
    number: SubscriberNumber
    /** existing voip_numbers row taken over, a new row is created if not set */
    numberId?: number
    isPrimary: boolean
    isDevId: boolean
    /** provisioning id of the pool owner the number is taken from */
    fromProvisioningId?: number
}

/**
 * Number the written subscriber gives up: back to the pool owner, else unassigned
 */
export interface SubscriberNumberRelease {
    numberId: number
    number: SubscriberNumber
    toOwner?: {id: number, provisioningId: number, provisioningDomainId: number}
}

export interface SubscriberPasswordJournalEntry {
    hash: string
    keep: number
}

/**
 * Everything a create or update writes for one subscriber; undefined parts are left as they are
 */
export interface SubscriberWritePlan {
    /** target state; id, provisioningId and uuid set on update */
    subscriber: internal.Subscriber
    resellerId: number
    provisioningDomainId: number
    allowCli: boolean
    numbers?: {
        primary: SubscriberNumberAssignment | null
        aliases: SubscriberNumberAssignment[]
        released: SubscriberNumberRelease[]
    }
    /** single value usr preferences by attribute, null deletes */
    preferences: Record<string, string | null>
    /** contact email/timezone, null removes the contact */
    contact?: {email: string | null, timezone: string | null} | null
    webpasswordHash?: string
    passwordJournal?: SubscriberPasswordJournalEntry
    webpasswordJournal?: SubscriberPasswordJournalEntry
    /** groups of a member: replaces its memberships */
    groups?: SubscriberRef[]
    /** members of a group in hunting order: replaces them */
    members?: SubscriberRef[]
    voicemail?: {mailbox?: string, password?: string}
    /** call forward destinations follow the new primary number (or the uuid when it was removed) */
    forwards?: {number: string, primaryRemoved: boolean}
    /** usr preferences and call forward types no longer allowed by the profile */
    removedAttributeIds?: number[]
}

/**
 * Everything a termination writes for one subscriber
 */
export interface SubscriberTerminatePlan {
    subscriber: internal.Subscriber
    /** all numbers of the subscriber: back to the pool owner, else unassigned */
    released: SubscriberNumberRelease[]
    allowCli: boolean
}

export interface SubscriberRepository {
    readAll(sr: ServiceRequest, scope: SubscriberScope): Promise<[internal.Subscriber[], number]>

    readById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined>

    readWhereInIds(ids: number[], scope: SubscriberScope): Promise<internal.Subscriber[]>

    readPilot(customerId: number): Promise<internal.Subscriber | undefined>

    readByCustomer(customerId: number): Promise<internal.Subscriber[]>

    readCustomers(ids: number[], resellerId?: number): Promise<SubscriberCustomer[]>

    lockContracts(ids: number[]): Promise<void>

    readDomain(domain: {id?: number, name?: string}): Promise<SubscriberDomain | undefined>

    countActive(customerId: number): Promise<number>

    countActiveByReseller(resellerId: number): Promise<number>

    existsUsername(username: string, domainId: number): Promise<boolean>

    existsWebusername(webusername: string, provisioningDomainId: number, excludeProvisioningId?: number): Promise<boolean>

    extensionInUse(customerId: number, extension: string, excludeId?: number): Promise<boolean>

    readNumbers(numbers: SubscriberNumber[]): Promise<SubscriberNumberRow[]>

    readAliasOwners(usernames: string[]): Promise<Map<string, number[]>>

    readRefs(ids: number[], customerId: number, groups: boolean): Promise<SubscriberRef[]>

    readProfileSet(id: number): Promise<{id: number, resellerId: number} | undefined>

    readProfiles(setId: number): Promise<SubscriberProfileRow[]>

    readProfileAttributeIds(profileId: number): Promise<number[]>

    readPreferences(provisioningId: number, attributes: string[]): Promise<Map<string, string[]>>

    readPasswordJournal(provisioningId: number, web: boolean): Promise<string[]>

    create(plan: SubscriberWritePlan): Promise<number>

    update(plan: SubscriberWritePlan): Promise<void>

    terminate(plan: SubscriberTerminatePlan): Promise<void>

    setCustomerPreference(customerId: number, attribute: string, value: string): Promise<void>
}
