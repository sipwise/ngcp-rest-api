import {ApiProperty, ApiPropertyOptions} from '@nestjs/swagger'
import {Transform} from 'class-transformer'
import {ValidateBy, ValidationArguments} from 'class-validator'

import {DateTimeInputError, dateTimeInputToValue, inputZone} from '~/helpers/date-time-input.helper'

export enum DateTimeKind {
    DateTime = 'date-time',
    LocalDateTime = 'local-date-time',
    LocalTime = 'local-time',
}

const DATE_TIME_FIELDS_KEY = Symbol('dateTimeFields')
const API_MODEL_PROPERTIES_KEY = 'swagger/apiModelProperties'

const swaggerOptions: Record<DateTimeKind, {format: string, timezone: string, example: string, suffix: string}> = {
    [DateTimeKind.DateTime]: {
        format: 'date-time',
        timezone: 'user',
        example: '2026-12-01T00:00:00.000+01:00',
        suffix: 'RFC 3339 with offset, in the timezone of the request (tz, default: the user\'s timezone).',
    },
    [DateTimeKind.LocalDateTime]: {
        format: 'local-date-time',
        timezone: 'platform',
        example: '2026-12-01 00:00:00',
        suffix: 'Platform time as stored, without offset; tz does not apply.',
    },
    [DateTimeKind.LocalTime]: {
        format: 'local-time',
        timezone: 'platform',
        example: '18:00:00',
        suffix: 'Platform time of day, without offset; tz does not apply.',
    },
}

// the notes the document appends to the descriptions of date/time fields
export const DATE_TIME_DESCRIPTION_SUFFIXES = Object.values(swaggerOptions).map(options => options.suffix)

/**
 * Date/time fields of a DTO (own and inherited) by property name
 */
export function dateTimeFields(target: object): ReadonlyMap<string, DateTimeKind> | undefined {
    const prototype: object | null = typeof target == 'function' ? target.prototype : Object.getPrototypeOf(target)
    return prototype ? Reflect.getMetadata(DATE_TIME_FIELDS_KEY, prototype) as Map<string, DateTimeKind> | undefined : undefined
}

/**
 * Client value of a date/time field that failed to parse, reported by the field's validator
 */
class InvalidDateTimeValue {
    constructor(readonly message: string) {
    }
}

function toDateTimeValue(value: unknown, kind: DateTimeKind): unknown {
    if (value == null || value instanceof Date)
        return value
    try {
        return dateTimeInputToValue(typeof value == 'string' ? value.trim() : value, kind, inputZone)
    } catch (err) {
        if (err instanceof DateTimeInputError)
            return new InvalidDateTimeValue(err.message)
        throw err
    }
}

// null and undefined are left to the field's own validators (@IsOptional, @CanBeNull)
function isDateTimeValue(value: unknown, kind: DateTimeKind): boolean {
    if (value == null)
        return true
    return kind == DateTimeKind.LocalTime ? typeof value == 'string' : value instanceof Date
}

function dateTimeField(kind: DateTimeKind): PropertyDecorator {
    return (target: object, propertyKey: string | symbol): void => {
        const key = String(propertyKey)
        const own: Map<string, DateTimeKind> | undefined = Reflect.getOwnMetadata(DATE_TIME_FIELDS_KEY, target)
        const fields = own ?? new Map(Reflect.getMetadata(DATE_TIME_FIELDS_KEY, target) ?? [])
        fields.set(key, kind)
        if (!own)
            Reflect.defineMetadata(DATE_TIME_FIELDS_KEY, fields, target)

        // request input (plainToInstance): parsed per kind, failures become validation errors (422 with pointer)
        Transform(({value}) => toDateTimeValue(value, kind), {toClassOnly: true})(target, propertyKey)
        ValidateBy({
            name: 'isDateTime',
            validator: {
                validate: (value: unknown): boolean => isDateTimeValue(value, kind),
                defaultMessage: (args: ValidationArguments): string => args.value instanceof InvalidDateTimeValue
                    ? `${args.property} ${args.value.message}`
                    : `${args.property} must be a ${swaggerOptions[kind].format} value`,
            },
        })(target, key)

        // merges into the field's own @ApiProperty, which must be applied first (placed below this decorator)
        const options = swaggerOptions[kind]
        const existing = Reflect.getMetadata(API_MODEL_PROPERTIES_KEY, target, propertyKey) ?? {}
        const swagger: ApiPropertyOptions & Record<`x-${string}`, string> = {
            format: options.format,
            'x-timezone': options.timezone,
            example: existing.example ?? options.example,
            description: existing.description
                ? `${existing.description.replace(/\.?$/, '.')} ${options.suffix}`
                : options.suffix,
        }
        ApiProperty(swagger)(target, propertyKey)
    }
}

/**
 * Date/time value (an instant): rendered as RFC 3339 with offset in the request's zone (tz, owner or the
 * user's zone). Place it above the field's @ApiProperty.
 */
export function DateTimeField(): PropertyDecorator {
    return dateTimeField(DateTimeKind.DateTime)
}

/**
 * Local platform date/time (billing values, wall-clock rules): rendered as stored, without offset, tz never
 * applies. Place it above the field's @ApiProperty.
 */
export function LocalDateTimeField(options: {timeOnly?: boolean} = {}): PropertyDecorator {
    return dateTimeField(options.timeOnly ? DateTimeKind.LocalTime : DateTimeKind.LocalDateTime)
}
