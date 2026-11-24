import {ValidateBy, ValidationArguments} from 'class-validator'

import {internal} from '~/entities'
import {errorMessage} from '~/helpers/errors.helper'

export const weekdays = [
    'MO',
    'TU',
    'WE',
    'TH',
    'FR',
    'SA',
    'SU',
]

// RFC 5545 dur-value without a sign: weeks, or days with optional time, or time
const durationPattern = /^P(?:\d+W|\d+D(?:T(?:\d+H(?:\d+M(?:\d+S)?)?|\d+M(?:\d+S)?|\d+S))?|T(?:\d+H(?:\d+M(?:\d+S)?)?|\d+M(?:\d+S)?|\d+S))$/

const bydayPattern = /^(?:[+-]?(?:[1-9]|[1-4]\d|5[0-3]))?(?:MO|TU|WE|TH|FR|SA|SU)$/

// the fields of an event, of its request DTO and of its internal entity alike
type EventRuleFields = Omit<internal.TimeSetEvent, 'id' | 'timeSetId'>

// fields that only make sense in a recurrence rule
const recurrenceFields: (keyof EventRuleFields)[] = [
    'interval',
    'until',
    'count',
    'bysecond',
    'byminute',
    'byhour',
    'byday',
    'bymonthday',
    'byyearday',
    'byweekno',
    'bymonth',
    'bysetpos',
    'wkst',
]

export interface EventRuleViolation {
    field: string
    key: 'EVENT_END_AND_DURATION' | 'EVENT_END_BEFORE_START' | 'EVENT_UNTIL_AND_COUNT' | 'EVENT_REQUIRES_FREQ'
}

/**
 * Violations of the rules between the fields of a complete event, reported on the field that is set against
 * the other. They need the state after the write: a PATCH validates only the patched fields.
 */
export function eventRuleViolations(event: EventRuleFields): EventRuleViolation[] {
    const violations: EventRuleViolation[] = []
    if (event.end != null && event.duration != null)
        violations.push({field: 'duration', key: 'EVENT_END_AND_DURATION'})
    if (event.start instanceof Date && event.end instanceof Date && event.end < event.start)
        violations.push({field: 'end', key: 'EVENT_END_BEFORE_START'})
    if (event.until != null && event.count != null)
        violations.push({field: 'count', key: 'EVENT_UNTIL_AND_COUNT'})
    if (event.freq == null) {
        for (const field of recurrenceFields) {
            if (event[field] != null)
                violations.push({field, key: 'EVENT_REQUIRES_FREQ'})
        }
    }
    return violations
}

/**
 * Comma-separated list of integers without spaces, e.g. `1,15,-1`; with `signed` the values may be negative
 * (counted from the end), 0 is never allowed then
 */
export function IsByList(options: {min: number, max: number, signed?: boolean}): PropertyDecorator {
    const {min, max, signed} = options
    const range = signed ? `from ${min} to ${max} or from -${max} to -${min}` : `from ${min} to ${max}`
    const isValid = (item: string): boolean => {
        if (!(signed ? /^[+-]?\d+$/ : /^\d+$/).test(item))
            return false
        const value = Math.abs(+item)
        return value >= min && value <= max
    }
    return (target: object, propertyKey: string | symbol): void => {
        ValidateBy({
            name: 'isByList',
            validator: {
                validate: (value: unknown): boolean => typeof value == 'string' && value.split(',').every(isValid),
                defaultMessage: (args: ValidationArguments): string =>
                    `${args.property} ${errorMessage('INVALID_BY_LIST', {range}).message}`,
            },
        })(target, String(propertyKey))
    }
}

/**
 * Comma-separated list of weekdays with an optional ordinal, e.g. `MO,-1FR`
 */
export function IsByDay(): PropertyDecorator {
    return (target: object, propertyKey: string | symbol): void => {
        ValidateBy({
            name: 'isByDay',
            validator: {
                validate: (value: unknown): boolean => typeof value == 'string' && value.split(',').every(item => bydayPattern.test(item)),
                defaultMessage: (args: ValidationArguments): string =>
                    `${args.property} ${errorMessage('INVALID_BYDAY').message}`,
            },
        })(target, String(propertyKey))
    }
}

/**
 * iCalendar duration without a sign, e.g. `P1D`, `PT2H30M`, `P2W`
 */
export function IsDuration(): PropertyDecorator {
    return (target: object, propertyKey: string | symbol): void => {
        ValidateBy({
            name: 'isDuration',
            validator: {
                validate: (value: unknown): boolean => typeof value == 'string' && durationPattern.test(value),
                defaultMessage: (args: ValidationArguments): string =>
                    `${args.property} ${errorMessage('INVALID_DURATION').message}`,
            },
        })(target, String(propertyKey))
    }
}
