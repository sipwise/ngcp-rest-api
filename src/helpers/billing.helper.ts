import {isInfiniteFuture, truncateToDay} from './date.helper'
import {platformTimezone, storedTimezone} from './timezone.helper'

import {BillingProfile} from '~/entities/internal/billing-profile.internal.entity'
import {
    IntervalStartMode,
    IntervalUnit,
    ProfilePackage,
} from '~/entities/internal/profile-package.internal.entity'

export function getFreeRatio(
    now: Date | null,
    stime: Date,
    etime: Date,
): number {
    if (!isInfiniteFuture(etime)) {
        const startOfNextInterval = new Date(etime.getTime() + 1000) // +1 second

        if (!now) {
            now = new Date() // current time
        }

        const nowTruncated = truncateToDay(now)
        const ctime = nowTruncated > stime ? nowTruncated : now

        const numerator = (startOfNextInterval.getTime() - ctime.getTime()) / 1000
        const denominator = (startOfNextInterval.getTime() - stime.getTime()) / 1000
        return numerator / denominator
    }

    return 1.0
}

const contractZoneStartModes: string[] = [
    IntervalStartMode.FirstTZ,
    IntervalStartMode.CreateTZ,
]

/**
 * Billing zone of a contract (as rate-o-mat): the contract's zone for the profile package start modes
 * 1st_tz/create_tz, else the platform zone. Only for computations (balance intervals, invoice months), never
 * for rendering or parsing date/time fields.
 */
export function billingTimezone(startMode: IntervalStartMode | null | undefined, contractTimezone: string | null | undefined): string {
    return startMode && contractZoneStartModes.includes(startMode)
        ? storedTimezone(contractTimezone)
        : platformTimezone()
}

export interface BalanceIntervalSettings {
    startMode: IntervalStartMode
    unit: IntervalUnit
    count: number
}

/**
 * Balance interval of a contract: from its profile package, else 1st of the month with the interval of the
 * billing profile
 */
export function balanceIntervalSettings(
    profile?: BillingProfile,
    profilePackage?: Pick<ProfilePackage, 'balanceIntervalStartMode' | 'balanceIntervalUnit' | 'balanceIntervalValue'>,
): BalanceIntervalSettings {
    if (profilePackage) {
        return {
            startMode: profilePackage.balanceIntervalStartMode ?? IntervalStartMode.First,
            unit: profilePackage.balanceIntervalUnit ?? IntervalUnit.Month,
            count: profilePackage.balanceIntervalValue ?? 1,
        }
    }
    return {
        startMode: IntervalStartMode.First,
        unit: (profile?.intervalUnit as string as IntervalUnit) ?? IntervalUnit.Month,
        count: profile?.intervalCount ?? 1,
    }
}

const infiniteFuture = (): Date => new Date(9999, 11, 31, 23, 59, 59)

/**
 * Adds the interval; months keep the last day of the month (Jan 31 -> Feb 28, Apr 30 -> May 31), aligned to
 * the contract creation day for the create modes
 */
function addInterval(
    from: Temporal.ZonedDateTime,
    unit: IntervalUnit,
    count: number,
    alignEom?: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime {
    switch (unit) {
        case IntervalUnit.Minute:
            return from.add({minutes: count})
        case IntervalUnit.Hour:
            return from.add({hours: count})
        case IntervalUnit.Day:
            return from.add({days: count})
        case IntervalUnit.Week:
            return from.add({weeks: count})
        case IntervalUnit.Month: {
            const lastDay = from.day == from.daysInMonth
            let to = from.add({months: count})
            if (lastDay)
                to = to.with({day: to.daysInMonth})
            if (alignEom && lastDay && to.day > alignEom.day)
                to = to.with({day: to.daysInMonth - (alignEom.daysInMonth - alignEom.day)})
            return to
        }
    }
}

/**
 * First balance interval of a contract created at `create`, by the start mode (as the v1 panel and
 * rate-o-mat): create/create_tz from the creation day 00:00, 1st/1st_tz from the 1st of the month 00:00,
 * topup/topup_interval from the creation time without end. `zone` is the billing zone (billingTimezone).
 */
export function initialBalanceInterval(settings: BalanceIntervalSettings, create: Date, zone: string): {start: Date, end: Date} {
    const now = Temporal.Instant.fromEpochMilliseconds(create.getTime()).toZonedDateTimeISO(zone)
    let start: Temporal.ZonedDateTime
    let alignEom: Temporal.ZonedDateTime | undefined
    switch (settings.startMode) {
        case IntervalStartMode.Topup:
        case IntervalStartMode.TopupInterval:
            return {start: new Date(Math.floor(create.getTime() / 1000) * 1000), end: infiniteFuture()}
        case IntervalStartMode.Create:
        case IntervalStartMode.CreateTZ:
            start = now.startOfDay()
            alignEom = now
            break
        default:
            start = now.with({day: 1}).startOfDay()
    }
    const end = addInterval(start, settings.unit, settings.count, alignEom).subtract({seconds: 1})
    return {start: new Date(start.epochMilliseconds), end: new Date(end.epochMilliseconds)}
}
