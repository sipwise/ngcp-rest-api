// Temporal is native in Node 26, TypeScript 5.9 has no lib for it yet: the subset used by the API
declare global {
    namespace Temporal {
        type FractionalSecondDigits = 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

        interface InstantToStringOptions {
            fractionalSecondDigits?: FractionalSecondDigits
            timeZone?: string
        }

        interface ZonedDateTimeToStringOptions {
            fractionalSecondDigits?: FractionalSecondDigits
            offset?: 'auto' | 'never'
            timeZoneName?: 'auto' | 'never' | 'critical'
        }

        type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject'

        interface ToZonedDateTimeOptions {
            disambiguation?: Disambiguation
        }

        interface ZonedDateTimeFromOptions extends ToZonedDateTimeOptions {
            offset?: 'use' | 'ignore' | 'prefer' | 'reject'
        }

        interface PlainToStringOptions {
            smallestUnit?: 'minute' | 'second' | 'millisecond'
            fractionalSecondDigits?: FractionalSecondDigits
        }

        class PlainTime {
            static from(item: string): PlainTime
            toString(options?: PlainToStringOptions): string
        }

        class PlainDateTime {
            static from(item: string): PlainDateTime
            equals(other: PlainDateTime): boolean
            toZonedDateTime(timeZone: string, options?: ToZonedDateTimeOptions): ZonedDateTime
            toString(options?: PlainToStringOptions): string
        }

        interface DurationLike {
            years?: number
            months?: number
            weeks?: number
            days?: number
            hours?: number
            minutes?: number
            seconds?: number
        }

        class PlainDate {
            static from(item: string): PlainDate
            toPlainDateTime(time?: PlainTime): PlainDateTime
            // start of the day in the zone
            toZonedDateTime(timeZone: string): ZonedDateTime
        }

        class PlainYearMonth {
            static from(item: string): PlainYearMonth
            add(duration: DurationLike): PlainYearMonth
            toPlainDate(fields: {day: number}): PlainDate
        }

        class Instant {
            static from(item: string): Instant
            static fromEpochMilliseconds(epochMilliseconds: number): Instant
            readonly epochMilliseconds: number
            toZonedDateTimeISO(timeZone: string): ZonedDateTime
            toString(options?: InstantToStringOptions): string
        }

        class ZonedDateTime {
            static from(item: string, options?: ZonedDateTimeFromOptions): ZonedDateTime
            readonly timeZoneId: string
            readonly offset: string
            readonly offsetNanoseconds: number
            readonly epochMilliseconds: number
            readonly year: number
            readonly month: number
            readonly day: number
            readonly hour: number
            readonly minute: number
            readonly second: number
            // Monday = 1 ... Sunday = 7
            readonly dayOfWeek: number
            readonly dayOfYear: number
            readonly daysInMonth: number
            add(duration: DurationLike): ZonedDateTime
            subtract(duration: DurationLike): ZonedDateTime
            with(fields: {day?: number, month?: number, year?: number}): ZonedDateTime
            startOfDay(): ZonedDateTime
            toInstant(): Instant
            toPlainDateTime(): PlainDateTime
            toString(options?: ZonedDateTimeToStringOptions): string
        }

        namespace Now {
            function instant(): Instant
            function timeZoneId(): string
        }
    }
}

export {}
