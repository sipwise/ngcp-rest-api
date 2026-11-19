import {balanceIntervalSettings, billingTimezone, initialBalanceInterval} from './billing.helper'

import {BillingProfile, IntervalUnit as ProfileIntervalUnit} from '~/entities/internal/billing-profile.internal.entity'
import {IntervalStartMode, IntervalUnit} from '~/entities/internal/profile-package.internal.entity'
import {LoggerService} from '~/logger/logger.service'

// unit specs run in Europe/Vienna: the platform zone
const platform = 'Europe/Vienna'
const tokyo = 'Asia/Tokyo'
const newYork = 'America/New_York'

const interval = (startMode: IntervalStartMode, unit = IntervalUnit.Month, count = 1): {startMode: IntervalStartMode, unit: IntervalUnit, count: number} =>
    ({startMode, unit, count})

describe('billing helper', () => {
    describe('billingTimezone', () => {
        it.each([
            [IntervalStartMode.FirstTZ, tokyo],
            [IntervalStartMode.CreateTZ, tokyo],
            [IntervalStartMode.First, platform],
            [IntervalStartMode.Create, platform],
            [IntervalStartMode.Topup, platform],
            [IntervalStartMode.TopupInterval, platform],
            [undefined, platform],
            [null, platform],
        ])('uses for start mode %s the zone %s', (mode, zone) => {
            expect(billingTimezone(mode, tokyo)).toEqual(zone)
        })
        it.each([null, undefined, 'localtime', 'SYSTEM'])('uses the platform zone for the stored contract zone %s', name => {
            expect(billingTimezone(IntervalStartMode.FirstTZ, name)).toEqual(platform)
        })
        it('uses the platform zone and warns for an invalid stored contract zone', () => {
            const warnSpy = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation(() => undefined)
            expect(billingTimezone(IntervalStartMode.FirstTZ, 'Mars/Base')).toEqual(platform)
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Mars/Base'))
            warnSpy.mockRestore()
        })
    })

    describe('balanceIntervalSettings', () => {
        it('takes the interval of the profile package', () => {
            const profile = BillingProfile.create({intervalUnit: ProfileIntervalUnit.Week, intervalCount: 2} as BillingProfile)
            expect(balanceIntervalSettings(profile, {
                balanceIntervalStartMode: IntervalStartMode.CreateTZ, balanceIntervalUnit: IntervalUnit.Day, balanceIntervalValue: 3,
            })).toEqual(interval(IntervalStartMode.CreateTZ, IntervalUnit.Day, 3))
        })
        it('takes the interval of the billing profile from the 1st without a package', () => {
            const profile = BillingProfile.create({intervalUnit: ProfileIntervalUnit.Week, intervalCount: 2} as BillingProfile)
            expect(balanceIntervalSettings(profile)).toEqual(interval(IntervalStartMode.First, IntervalUnit.Week, 2))
            expect(balanceIntervalSettings(undefined)).toEqual(interval(IntervalStartMode.First))
        })
    })

    describe('initialBalanceInterval', () => {
        const now = new Date(2026, 10, 16, 14, 36, 20, 500)

        it.each([
            ['1st month', interval(IntervalStartMode.First), now, new Date(2026, 10, 1), new Date(2026, 10, 30, 23, 59, 59)],
            ['1st 3 months', interval(IntervalStartMode.First, IntervalUnit.Month, 3), now, new Date(2026, 10, 1), new Date(2027, 0, 31, 23, 59, 59)],
            ['1st 2 weeks', interval(IntervalStartMode.First, IntervalUnit.Week, 2), now, new Date(2026, 10, 1), new Date(2026, 10, 14, 23, 59, 59)],
            // the spring DST change is within the interval
            ['1st month in March', interval(IntervalStartMode.First), new Date(2026, 2, 31, 23, 0, 0), new Date(2026, 2, 1), new Date(2026, 2, 31, 23, 59, 59)],
            ['create month', interval(IntervalStartMode.Create), new Date(2026, 2, 15, 10, 0, 0), new Date(2026, 2, 15), new Date(2026, 3, 14, 23, 59, 59)],
            ['create day', interval(IntervalStartMode.Create, IntervalUnit.Day), new Date(2026, 2, 29, 10, 0, 0), new Date(2026, 2, 29), new Date(2026, 2, 29, 23, 59, 59)],
            ['create hours', interval(IntervalStartMode.Create, IntervalUnit.Hour, 6), now, new Date(2026, 10, 16), new Date(2026, 10, 16, 5, 59, 59)],
            ['create minutes', interval(IntervalStartMode.Create, IntervalUnit.Minute, 30), now, new Date(2026, 10, 16), new Date(2026, 10, 16, 0, 29, 59)],
            // the last day of the month stays the last day (v1 end_of_month 'preserve')
            ['create on day 31, 30-day month next', interval(IntervalStartMode.Create), new Date(2026, 2, 31, 10, 0, 0), new Date(2026, 2, 31), new Date(2026, 3, 29, 23, 59, 59)],
            ['create on day 31, February next', interval(IntervalStartMode.Create), new Date(2026, 0, 31, 10, 0, 0), new Date(2026, 0, 31), new Date(2026, 1, 27, 23, 59, 59)],
            ['create on day 30, 31-day month next', interval(IntervalStartMode.Create), new Date(2026, 3, 30, 10, 0, 0), new Date(2026, 3, 30), new Date(2026, 4, 30, 23, 59, 59)],
            ['create on day 30, not the last day', interval(IntervalStartMode.Create), new Date(2026, 0, 30, 10, 0, 0), new Date(2026, 0, 30), new Date(2026, 1, 27, 23, 59, 59)],
            ['create on day 29 of a leap year', interval(IntervalStartMode.Create), new Date(2028, 1, 29, 10, 0, 0), new Date(2028, 1, 29), new Date(2028, 2, 30, 23, 59, 59)],
            ['topup', interval(IntervalStartMode.Topup), now, new Date(2026, 10, 16, 14, 36, 20), new Date(9999, 11, 31, 23, 59, 59)],
            ['topup_interval', interval(IntervalStartMode.TopupInterval), now, new Date(2026, 10, 16, 14, 36, 20), new Date(9999, 11, 31, 23, 59, 59)],
        ])('starts %s in the platform zone', (_name, settings, create, start, end) => {
            expect(initialBalanceInterval(settings, create, platform)).toEqual({start, end})
        })

        it.each([
            // 2026-11-16 14:36 in Vienna is 22:36 in Tokyo
            ['1st_tz', interval(IntervalStartMode.FirstTZ), now, tokyo, '2026-11-01T00:00:00+09:00', '2026-11-30T23:59:59+09:00'],
            // 2026-11-30 17:00 in Vienna is already December in Tokyo
            ['1st_tz in the next month', interval(IntervalStartMode.FirstTZ), new Date(2026, 10, 30, 17, 0, 0), tokyo, '2026-12-01T00:00:00+09:00', '2026-12-31T23:59:59+09:00'],
            ['create_tz', interval(IntervalStartMode.CreateTZ), now, tokyo, '2026-11-16T00:00:00+09:00', '2026-12-15T23:59:59+09:00'],
            // 2026-11-16 03:00 in Vienna is the evening before in New York
            ['create_tz behind', interval(IntervalStartMode.CreateTZ), new Date(2026, 10, 16, 3, 0, 0), newYork, '2026-11-15T00:00:00-05:00', '2026-12-14T23:59:59-05:00'],
            // New York leaves summer time on 2026-11-01
            ['1st_tz over a DST change', interval(IntervalStartMode.FirstTZ), new Date(2026, 9, 15, 12, 0, 0), newYork, '2026-10-01T00:00:00-04:00', '2026-10-31T23:59:59-04:00'],
            ['1st_tz 2 weeks', interval(IntervalStartMode.FirstTZ, IntervalUnit.Week, 2), now, tokyo, '2026-11-01T00:00:00+09:00', '2026-11-14T23:59:59+09:00'],
        ])('starts %s in the billing zone', (_name, settings, create, zone, start, end) => {
            expect(initialBalanceInterval(settings, create, zone)).toEqual({start: new Date(start), end: new Date(end)})
        })

        it('starts the default interval on the 1st as before, also around DST changes', () => {
            const before = (date: Date, count: number): {start: Date, end: Date} => {
                const start = new Date(date.getFullYear(), date.getMonth(), 1)
                return {start, end: new Date(new Date(start.getFullYear(), start.getMonth() + count, 1).getTime() - 1000)}
            }
            for (let month = 0; month < 24; month++) {
                for (const count of [1, 2, 12]) {
                    const date = new Date(2026, month, 28, 2, 30, 0)
                    expect(initialBalanceInterval(interval(IntervalStartMode.First, IntervalUnit.Month, count), date, platform)).toEqual(before(date, count))
                }
            }
        })
    })
})
