import {isInfiniteFuture, truncateToDay} from './date.helper'

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