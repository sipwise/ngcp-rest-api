import {UnprocessableEntityException} from '@nestjs/common'
import {plainToInstance} from 'class-transformer'
import ICAL from 'ical.js'

import {ErrorEntry, ValidationFailedException, errorMessage, formatValidationErrors} from '~/helpers/errors.helper'
import {checkWriteLimit} from '~/helpers/request-limits.helper'
import {canonicalTimezone, platformTimezone} from '~/helpers/timezone.helper'
import {validate} from '~/helpers/validate.helper'
import {forEachYield, mapYield} from '~/helpers/yield.helper'

/**
 * An event with the field names of the event request DTO; times are platform wall clocks
 * (`YYYY-MM-DD HH:MM:SS`)
 */
export interface TimeSetCalendarEvent {
    start: string
    end?: string
    duration?: string
    freq?: string
    interval?: number
    until?: string
    count?: number
    bysecond?: string
    byminute?: string
    byhour?: string
    byday?: string
    bymonthday?: string
    byyearday?: string
    byweekno?: string
    bymonth?: string
    bysetpos?: string
    wkst?: string
    comment?: string
}

interface EventContext {
    platformZone: string
    timezones: Map<string, ICAL.Timezone>
    // the UID of the event, else its 1-based position
    label: string
}

type JCalProperty = [name: string, params: object, type: string, value: unknown]

const calendarMimeTypes = [
    'text/calendar',
    'application/octet-stream',
]

const unsupportedProperties = ['rdate', 'exdate', 'exrule', 'recurrence-id']

const byParts = ['bysecond', 'byminute', 'byhour', 'byday', 'bymonthday', 'byyearday', 'byweekno', 'bymonth', 'bysetpos'] as const

const recurrenceParts = ['freq', 'interval', 'count', 'until', 'wkst', ...byParts]

// ICAL.Recur numbers the weekdays from SU = 1
const weekdays = [undefined, 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

const timePattern = /^(?<date>\d{4}-\d{2}-\d{2})(?:T(?<time>\d{2}:\d{2}:\d{2})(?<utc>Z)?)?$/

/**
 * Maps the VEVENTs of an iCalendar file to time set events. Throws a 422 for a malformed file and for everything
 * that has no event field.
 * @param platformZone zone of the platform wall clocks the times are converted to
 */
export async function parseTimeSetCalendar(text: string, platformZone: string): Promise<TimeSetCalendarEvent[]> {
    const calendar = parseCalendar(text)
    const timezones = readTimezones(calendar)
    return await mapYield(calendar.getAllSubcomponents('vevent'), (event, index) => {
        const uid = event.getFirstPropertyValue('uid')
        const label = typeof uid == 'string' && uid ? `'${uid}'` : `#${index + 1}`
        return toEvent(event, {platformZone, timezones, label})
    })
}

/**
 * The events of an uploaded iCalendar file (`text/calendar` or `application/octet-stream`) as validated request
 * DTOs, converted to the platform time
 * @param pointer pointer of the events in the request, the errors of an event are under `<pointer>/<index>`
 */
export async function calendarToDtos<T extends object>(file: Express.Multer.File, dtoClass: new () => T, pointer = ''): Promise<T[]> {
    if (!calendarMimeTypes.includes(file.mimetype))
        throw new UnprocessableEntityException(errorMessage('FILE_MIME_TYPE_NOT_SUPPORTED'))
    const events = await parseTimeSetCalendar(file.buffer.toString('utf-8'), platformTimezone())
    checkWriteLimit(events.length)

    const dtos = await mapYield(events, event => plainToInstance(dtoClass, event))
    const errors: ErrorEntry[] = []
    await forEachYield(dtos, async (dto, index) => {
        errors.push(...formatValidationErrors(await validate(dto), `${pointer}/${index}`))
    })
    if (errors.length)
        throw new ValidationFailedException(errors)
    return dtos
}

function parseCalendar(text: string): ICAL.Component {
    let jCal: unknown[]
    try {
        jCal = ICAL.parse(uppercaseFrequencies(text.replace(/^\uFEFF/, ''))) as unknown[]
    } catch {
        throw new UnprocessableEntityException(errorMessage('CALENDAR_MALFORMED'))
    }
    // anything else is no calendar: empty text, another component, several calendars (an array of arrays)
    if (jCal[0] != 'vcalendar')
        throw new UnprocessableEntityException(errorMessage('CALENDAR_MALFORMED'))
    return new ICAL.Component(jCal)
}

// v_time_sets_ical writes FREQ as stored (lowercase), ical.js reads uppercase only
function uppercaseFrequencies(text: string): string {
    return text.replace(/^(RRULE[:;][^\r\n]*?\bFREQ=)([A-Za-z]+)/gm, (_, head: string, freq: string) => head + freq.toUpperCase())
}

function readTimezones(calendar: ICAL.Component): Map<string, ICAL.Timezone> {
    const timezones = new Map<string, ICAL.Timezone>()
    for (const component of calendar.getAllSubcomponents('vtimezone')) {
        const tzid = component.getFirstPropertyValue('tzid')
        if (typeof tzid != 'string')
            continue
        try {
            timezones.set(tzid, new ICAL.Timezone(component))
        } catch {
            // an unusable definition is an unknown timezone for the events that use it
        }
    }
    return timezones
}

function toEvent(event: ICAL.Component, context: EventContext): TimeSetCalendarEvent {
    for (const name of unsupportedProperties) {
        if (event.hasProperty(name))
            throw unsupported(name.toUpperCase(), context)
    }
    const rrules = event.getAllProperties('rrule')
    if (rrules.length > 1)
        throw unsupported('RRULE', context)

    const dtstart = event.getFirstProperty('dtstart')
    if (!dtstart)
        throw new UnprocessableEntityException(errorMessage('CALENDAR_MISSING_DTSTART', {event: context.label}))

    const result: TimeSetCalendarEvent = {start: propertyTime(dtstart, context)}
    const dtend = event.getFirstProperty('dtend')
    if (dtend)
        result.end = propertyTime(dtend, context)
    const duration = event.getFirstProperty('duration')
    if (duration)
        result.duration = rawValue(duration) as string
    if (rrules.length)
        Object.assign(result, toRecurrence(rrules[0], context))
    const comment = event.getFirstPropertyValue('description') || event.getFirstPropertyValue('summary')
    if (typeof comment == 'string' && comment)
        result.comment = comment
    return result
}

function toRecurrence(rrule: ICAL.Property, context: EventContext): Partial<TimeSetCalendarEvent> {
    const parts = rawValue(rrule) as Record<string, string | number | (string | number)[]>
    for (const part of Object.keys(parts)) {
        if (!recurrenceParts.includes(part))
            throw unsupported(`RRULE ${part.toUpperCase()}`, context)
    }

    const result: Partial<TimeSetCalendarEvent> = {freq: String(parts.freq).toLowerCase()}
    if (parts.interval !== undefined)
        result.interval = Number(parts.interval)
    if (parts.count !== undefined)
        result.count = Number(parts.count)
    if (parts.until !== undefined)
        result.until = convertTime(parts.until, undefined, 'RRULE UNTIL', context)
    if (parts.wkst !== undefined)
        result.wkst = weekdays[Number(parts.wkst)]
    for (const part of byParts) {
        if (parts[part] !== undefined)
            result[part] = [parts[part]].flat().join(',')
    }
    return result
}

function propertyTime(property: ICAL.Property, context: EventContext): string {
    const tzid = property.getParameter('tzid')
    return convertTime(rawValue(property), typeof tzid == 'string' ? tzid : undefined, property.name.toUpperCase(), context)
}

/**
 * Platform wall clock of a jCal date or date-time: a date is its midnight, a floating time stays as it is,
 * a UTC time or a time of a timezone is converted
 */
function convertTime(value: unknown, tzid: string | undefined, name: string, context: EventContext): string {
    const match = typeof value == 'string' ? timePattern.exec(value) : null
    if (!match)
        throw invalidValue(name, context)
    const {date, time = '00:00:00', utc} = match.groups

    let local: Temporal.PlainDateTime
    try {
        local = Temporal.PlainDateTime.from(`${date}T${time}`)
    } catch {
        throw invalidValue(name, context)
    }

    if (utc)
        return toPlatformTime(local.toZonedDateTime('UTC'), context)
    if (!match.groups.time || !tzid)
        return formatTime(local)

    const zone = canonicalTimezone(tzid)
    if (zone)
        return toPlatformTime(local.toZonedDateTime(zone, {disambiguation: 'compatible'}), context)

    const definition = context.timezones.get(tzid)
    if (!definition)
        throw new UnprocessableEntityException(errorMessage('CALENDAR_UNKNOWN_TIMEZONE', {tzid, property: name, event: context.label}))
    const offset = definition.utcOffset(ICAL.Time.fromDateTimeString(`${date}T${time}`))
    return toPlatformTime(local.toZonedDateTime('UTC').subtract({seconds: offset}), context)
}

function toPlatformTime(time: Temporal.ZonedDateTime, context: EventContext): string {
    return formatTime(time.toInstant().toZonedDateTimeISO(context.platformZone).toPlainDateTime())
}

function formatTime(time: Temporal.PlainDateTime): string {
    return time.toString({smallestUnit: 'second'}).replace('T', ' ')
}

function rawValue(property: ICAL.Property): unknown {
    return (property.jCal as JCalProperty)[3]
}

function unsupported(property: string, context: EventContext): UnprocessableEntityException {
    return new UnprocessableEntityException(errorMessage('CALENDAR_UNSUPPORTED_PROPERTY', {property, event: context.label}))
}

function invalidValue(property: string, context: EventContext): UnprocessableEntityException {
    return new UnprocessableEntityException(errorMessage('CALENDAR_INVALID_VALUE', {property, event: context.label}))
}
