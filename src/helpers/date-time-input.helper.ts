import {AsyncLocalStorage} from 'async_hooks'

import {Request} from 'express'

import {reservedQueryParamKeys} from '~/config/constants.config'
import {DateTimeKind} from '~/decorators/date-time-field.decorator'
import {errorMessage} from '~/helpers/errors.helper'
import {RequestTimezone, platformTimezone, requestTimezone} from '~/helpers/timezone.helper'
import {ErrorMessage} from '~/interfaces/error-message.interface'

/**
 * Parsed client date/time value: an exact instant (offset or [Zone]), a naive wall clock or a time of day
 */
export type DateTimeInput =
    | {instant: Temporal.Instant}
    | {plain: Temporal.PlainDateTime}
    | {time: Temporal.PlainTime}

/**
 * Error of a client date/time value: an errors.json entry
 */
export class DateTimeInputError extends Error {
    constructor(readonly error: ErrorMessage) {
        super(error.message)
    }
}

const hh = '(?:[01]\\d|2[0-3])'
const mm = '[0-5]\\d'
const fraction = '(?:\\.\\d{1,9})?'
const extendedTime = `${hh}:${mm}(?::${mm}${fraction})?`
const basicTime = `${hh}${mm}(?:${mm}${fraction})?`
const offset = '(?:[Zz]|[+-]\\d{2}(?::?\\d{2})?)'
const annotation = '(?:\\[[A-Za-z][\\w/+-]*\\])'
const extendedDateTime = `\\d{4}-\\d{2}-\\d{2}(?<time>[Tt ]${extendedTime}(?<offset>${offset})?)?`
const basicDateTime = `\\d{8}(?<time>[Tt]${basicTime}(?<offset>${offset})?)?`

const dateTimePattern = new RegExp(`^(?:${extendedDateTime}|${basicDateTime})(?<annotation>${annotation})?$`)
const yearMonthPattern = /^\d{4}-\d{2}$/
const timePattern = new RegExp(`^${hh}:${mm}(?::${mm})?$`)
const timeWithOffsetPattern = new RegExp(`^${extendedTime}${offset}$`)

function invalid(kind: DateTimeKind): DateTimeInputError {
    return new DateTimeInputError(errorMessage(kind == DateTimeKind.LocalTime ? 'INVALID_LOCAL_TIME' : 'INVALID_DATE_TIME'))
}

/**
 * Parses a client value of a date/time field or filter: [Zone] annotation -> exact, offset -> exact, else a
 * naive date/time (date only: 00:00, YYYY-MM: the 1st 00:00); time-only fields 'HH:MM[:SS]' without offset.
 * Throws DateTimeInputError for anything else.
 */
export function parseDateTimeInput(value: unknown, kind: DateTimeKind): DateTimeInput {
    if (typeof value != 'string')
        throw invalid(kind)
    if (kind == DateTimeKind.LocalTime) {
        if (timePattern.test(value))
            return {time: Temporal.PlainTime.from(value)}
        if (timeWithOffsetPattern.test(value))
            throw new DateTimeInputError(errorMessage('LOCAL_TIME_OFFSET'))
        throw invalid(kind)
    }
    try {
        if (yearMonthPattern.test(value))
            return {plain: Temporal.PlainYearMonth.from(value).toPlainDate({day: 1}).toPlainDateTime()}
        const match = dateTimePattern.exec(value)
        if (!match)
            throw invalid(kind)
        const groups = match.groups ?? {}
        if (groups.annotation)
            return {instant: Temporal.ZonedDateTime.from(value, {offset: 'reject', disambiguation: 'reject'}).toInstant()}
        if (groups.offset)
            return {instant: Temporal.Instant.from(value)}
        if (groups.time)
            return {plain: Temporal.PlainDateTime.from(value)}
        return {plain: Temporal.PlainDate.from(value).toPlainDateTime()}
    } catch (err) {
        if (err instanceof DateTimeInputError)
            throw err
        throw invalid(kind)
    }
}

/**
 * Whether the value is a naive date/time (resolving it may need the user's zone)
 */
export function isNaiveDateTime(value: string): boolean {
    if (yearMonthPattern.test(value))
        return true
    const groups = dateTimePattern.exec(value)?.groups
    return groups != null && !groups.offset && !groups.annotation
}

/**
 * Instant of a @DateTimeField() value; naive values in the zone, a DST gap or repeated hour is rejected
 */
export function inputToInstant(input: DateTimeInput, zone: string): Temporal.Instant {
    if ('instant' in input)
        return input.instant
    if ('time' in input)
        throw new DateTimeInputError(errorMessage('INVALID_DATE_TIME'))
    try {
        return input.plain.toZonedDateTime(zone, {disambiguation: 'reject'}).toInstant()
    } catch {
        throw new DateTimeInputError(errorMessage('AMBIGUOUS_DATE_TIME', {zone}))
    }
}

/**
 * Platform wall clock of a @LocalDateTimeField() value: naive values as given, exact values converted to the
 * platform zone
 */
export function inputToPlatformDateTime(input: DateTimeInput): Temporal.PlainDateTime {
    if ('time' in input)
        throw new DateTimeInputError(errorMessage('INVALID_DATE_TIME'))
    return 'plain' in input ? input.plain : input.instant.toZonedDateTimeISO(platformTimezone()).toPlainDateTime()
}

/**
 * Date of a platform wall clock for storage (naive DB values are written in the process zone). Throws for a
 * wall clock that does not exist in the platform zone (spring gap) and, for exact input, one in the repeated
 * autumn hour: neither can be stored distinctly as platform time.
 */
export function platformDateTimeToDate(dateTime: Temporal.PlainDateTime, exact: boolean): Date {
    try {
        const zoned = dateTime.toZonedDateTime(platformTimezone(), {disambiguation: exact ? 'reject' : 'earlier'})
        if (!exact && !zoned.toPlainDateTime().equals(dateTime))
            throw new RangeError('wall clock in the DST gap')
        return new Date(zoned.epochMilliseconds)
    } catch {
        throw new DateTimeInputError(errorMessage('LOCAL_DATE_TIME_NOT_STORABLE', {zone: platformTimezone()}))
    }
}

/**
 * Converts a client value of a date/time field to the Date carried by DTOs: instants (naive values in `zone`)
 * or the platform wall clock of local values. Time-only values are kept as 'HH:MM:SS'.
 */
export function dateTimeInputToValue(value: unknown, kind: DateTimeKind, zone: () => string): Date | string {
    const input = parseDateTimeInput(value, kind)
    switch (kind) {
        case DateTimeKind.DateTime:
            return new Date(inputToInstant(input, 'plain' in input ? zone() : platformTimezone()).epochMilliseconds)
        case DateTimeKind.LocalDateTime:
            return platformDateTimeToDate(inputToPlatformDateTime(input), 'instant' in input)
        case DateTimeKind.LocalTime:
            return (input as {time: Temporal.PlainTime}).time.toString({smallestUnit: 'second'})
    }
}

const requestTimezoneStorage = new AsyncLocalStorage<RequestTimezone>()

/**
 * Runs the rest of the request with its timezone context, for input parsing outside of the request objects
 * (class-transformer, PATCH)
 */
export function runWithRequestTimezone<T>(timezone: RequestTimezone, callback: () => T): T {
    return requestTimezoneStorage.run(timezone, callback)
}

/**
 * Timezone context of the current request, undefined outside of a request
 */
export function currentRequestTimezone(): RequestTimezone | undefined {
    return requestTimezoneStorage.getStore()
}

/**
 * Zone for naive @DateTimeField() input of the current request: tz=<IANA>, else the user's zone (also for
 * tz=owner: no writable instant field has owner support), the platform zone outside of a request
 */
export function inputZone(): string {
    return currentRequestTimezone()?.resolvedDefaultZone() ?? platformTimezone()
}

// strings are split into CSV-like tokens: CSV bodies arrive as one string
function hasNaiveDateTime(value: unknown, depth = 0): boolean {
    if (typeof value == 'string')
        return value.split(/[,;\t\r\n"]/).some(token => isNaiveDateTime(token.trim()))
    if (value == null || typeof value != 'object' || depth > 16 || Buffer.isBuffer(value))
        return false
    return Object.values(value).some(item => hasNaiveDateTime(item, depth + 1))
}

/**
 * Resolves the user's zone before the handler when a filter or body value may be a naive date/time: filters
 * and request DTOs parse synchronously (configureQueryBuilder, class-transformer)
 */
export async function prepareInputTimezone(req: Request): Promise<void> {
    const timezone = requestTimezone(req)
    if (timezone.zone)
        return
    const filters = Object.entries(req.query ?? {})
        .filter(([key]) => !reservedQueryParamKeys.includes(key))
        .map(([, value]) => value)
    if (hasNaiveDateTime(filters) || hasNaiveDateTime(req.body))
        await timezone.defaultZone()
}
