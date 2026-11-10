import {isInfiniteFuture, truncateToDay} from './date.helper'

import {BillingProfile, IntervalUnit} from '~/entities/internal/billing-profile.internal.entity'

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

/**
 * First contract balance interval: starts on the 1st of the current month, lasts the interval of the billing profile
 */
export function initialBalanceInterval(profile: BillingProfile, now: Date): {start: Date, end: Date} {
    const count = profile.intervalCount ?? 1
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const next = profile.intervalUnit == IntervalUnit.Week
        ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * count)
        : new Date(start.getFullYear(), start.getMonth() + count, 1)
    return {start, end: new Date(next.getTime() - 1000)}
}
