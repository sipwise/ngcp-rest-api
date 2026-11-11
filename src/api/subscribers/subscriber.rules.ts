import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {
    SubscriberAliasNumber,
    SubscriberNumber,
} from '~/entities/internal/subscriber.internal.entity'

export type SubscriberField = keyof internal.Subscriber

type OptionalNumber = SubscriberNumber | null | undefined

export const immutableFields: SubscriberField[] = [
    'username',
    'domain',
    'domainId',
    'customerId',
    'isPbxPilot',
    'isPbxGroup',
]

const subscriberadminReadOnly: SubscriberField[] = [
    'administrative',
    'profileSetId',
    'profileId',
    'externalId',
]

const restrictedReadOnly: SubscriberField[] = [
    'lock',
    'status',
    'primaryNumber',
    'aliasNumbers',
]

const subscriberReadOnly: SubscriberField[] = [
    'pbxExtension',
    'pbxGroupIds',
    'pbxGroupmemberIds',
    'pbxHuntPolicy',
    'pbxHuntTimeout',
    'pbxHuntCancelMode',
]

export function readOnlyFields(
    role: string,
    callerId: number,
    target: internal.Subscriber,
): SubscriberField[] {
    if (role == RbacRole.subscriber) {
        return [
            ...subscriberadminReadOnly,
            ...restrictedReadOnly,
            ...subscriberReadOnly,
        ]
    }
    if (role != RbacRole.subscriberadmin)
        return []
    if (target.isPbxPilot || target.id == callerId)
        return [...subscriberadminReadOnly, ...restrictedReadOnly]
    return [...subscriberadminReadOnly]
}

/**
 * `cc ac sn` as dialled, also the dbalias username
 */
export function numberString(number: SubscriberNumber): string {
    return `${number.cc}${number.ac ?? ''}${number.sn}`
}

function numberKey(number: SubscriberNumber): string {
    return `${number.cc}/${number.ac ?? ''}/${number.sn}`
}

export function sameNumber(a: OptionalNumber, b: OptionalNumber): boolean {
    if (a == null || b == null)
        return a == null && b == null
    return numberKey(a) == numberKey(b)
}

/**
 * Alias lists as sets of numbers; is_devid is compared only where the
 * requested entry carries it
 */
export function sameAliases(
    stored: SubscriberAliasNumber[],
    requested: SubscriberAliasNumber[],
): boolean {
    if (stored.length != requested.length)
        return false
    const byKey = new Map(stored.map(number => [numberKey(number), number]))
    return requested.every(number => {
        const match = byKey.get(numberKey(number))
        if (match == undefined)
            return false
        return number.isDevId == undefined
            || !!number.isDevId == !!match.isDevId
    })
}

function sameIdSet(a: number[] | null, b: number[] | null): boolean {
    const left = new Set(a ?? [])
    const right = new Set(b ?? [])
    return left.size == right.size && [...left].every(id => right.has(id))
}

function sameIdList(a: number[] | null, b: number[] | null): boolean {
    const left = a ?? []
    const right = b ?? []
    return left.length == right.length
        && left.every((id, index) => id == right[index])
}

/**
 * Whether the requested value of a field equals the stored one
 * (null = empty: 0, false, '', [])
 */
export function sameValue(
    field: SubscriberField,
    stored: internal.Subscriber,
    requested: internal.Subscriber,
): boolean {
    const a = stored[field]
    const b = requested[field]
    switch (field) {
        case 'primaryNumber':
            return sameNumber(a as SubscriberNumber, b as SubscriberNumber)
        case 'aliasNumbers':
            return sameAliases(
                (a ?? []) as SubscriberAliasNumber[],
                (b ?? []) as SubscriberAliasNumber[],
            )
        case 'pbxGroupIds':
            return sameIdSet(a as number[], b as number[])
        case 'pbxGroupmemberIds':
            return sameIdList(a as number[], b as number[])
        case 'lock':
        case 'profileSetId':
        case 'profileId':
            return `${a ?? 0}` == `${b ?? 0}`
                || (+(a ?? 0) == 0 && +(b ?? 0) == 0)
        case 'administrative':
        case 'isPbxPilot':
        case 'isPbxGroup':
            return !!a == !!b
        case 'domain':
            return b == undefined || a == b
        default:
            return (a ?? '') === (b ?? '') || `${a ?? ''}` === `${b ?? ''}`
    }
}

/**
 * Fields of the list the request sets to a value other than the stored one;
 * omitted (undefined) fields don't count
 */
export function changedFields(
    stored: internal.Subscriber,
    requested: internal.Subscriber,
    fields: SubscriberField[],
): SubscriberField[] {
    return fields.filter(field =>
        requested[field] !== undefined
        && !sameValue(field, stored, requested),
    )
}

export function derivePrimary(
    pilotPrimary: SubscriberNumber,
    extension: string,
): SubscriberNumber {
    return {
        cc: pilotPrimary.cc,
        ac: pilotPrimary.ac ?? '',
        sn: `${pilotPrimary.sn}${extension}`,
    }
}

/**
 * New primary number of a subscriber when the pilot's number changes:
 * numbers with the pilot's cc/ac starting with its old sn (literal prefix)
 * get the new prefix; undefined when the number doesn't follow the pilot
 */
export function renumber(
    oldPilot: SubscriberNumber,
    newPilot: SubscriberNumber,
    number: SubscriberNumber,
): SubscriberNumber | undefined {
    const follows = number.cc == oldPilot.cc
        && (number.ac ?? '') == (oldPilot.ac ?? '')
        && number.sn.startsWith(oldPilot.sn)
    if (!follows)
        return undefined
    return {
        cc: newPilot.cc,
        ac: newPilot.ac ?? '',
        sn: `${newPilot.sn}${number.sn.slice(oldPilot.sn.length)}`,
    }
}

export interface PoolDiff {
    /** indexes of requested numbers neither of the target nor in the pool */
    notInPool: number[]
    assigned: SubscriberNumber[]
    revoked: SubscriberNumber[]
}

export function poolDiff(
    current: SubscriberNumber[],
    requested: SubscriberNumber[],
    pool: SubscriberNumber[],
): PoolDiff {
    const currentKeys = new Set(current.map(numberKey))
    const poolKeys = new Set(pool.map(numberKey))
    const requestedKeys = new Set(requested.map(numberKey))
    const notInPool: number[] = []
    const assigned: SubscriberNumber[] = []
    requested.forEach((number, index) => {
        const key = numberKey(number)
        if (currentKeys.has(key))
            return
        if (poolKeys.has(key))
            assigned.push(number)
        else
            notInPool.push(index)
    })
    const revoked = current.filter(n => !requestedKeys.has(numberKey(n)))
    return {notInPool, assigned, revoked}
}

/**
 * Index of the first number that repeats an earlier one (the primary counts
 * first), -1 if none
 */
export function duplicateAlias(
    primary: SubscriberNumber | null,
    aliases: SubscriberNumber[],
): number {
    const seen = new Set(primary ? [numberKey(primary)] : [])
    for (const [index, number] of aliases.entries()) {
        const key = numberKey(number)
        if (seen.has(key))
            return index
        seen.add(key)
    }
    return -1
}

/**
 * Whether the extension is within the customer's range; empty bounds don't
 * limit, a non-numeric extension is out of any range
 */
export function extInRange(
    extension: string | null,
    min: number | null,
    max: number | null,
): boolean {
    if (!extension)
        return true
    const hasMin = min != null && min != 0
    const hasMax = max != null && max != 0
    if (!hasMin && !hasMax)
        return true
    if (!/^\d+$/.test(extension))
        return false
    const value = +extension
    return (!hasMin || value >= min) && (!hasMax || value <= max)
}

/**
 * Whether adding subscribers exceeds a limit; a null or negative max is unlimited
 */
export function limitReached(
    max: number | null | undefined,
    current: number,
    adding: number = 1,
): boolean {
    return max != null && max >= 0 && current + adding > max
}

/**
 * Lock level of a write: given lock wins; locking without a level sets 4;
 * unlocking keeps the stored level; otherwise unlocked
 */
export function lockLevel(
    status: string,
    lock: string | null | undefined,
    stored?: internal.Subscriber,
): string | null {
    if (lock !== undefined)
        return lock
    if (status == 'locked')
        return stored?.status == 'locked' ? stored.lock ?? '4' : '4'
    return stored?.status == 'locked' ? stored.lock : null
}
