import {StreamableFile} from '@nestjs/common'

import {DateTimeKind, dateTimeFields} from '~/decorators/date-time-field.decorator'
import {
    OWNER_TIMEZONE,
    RequestTimezone,
    formatDateTime,
    formatLocalDateTime,
    formatLocalTime,
} from '~/helpers/timezone.helper'

const MAX_DEPTH = 16

// properties the expand= objects are attached to (ExpandHelper); they don't inherit the parent's owner zone
const EXPANDED_SUFFIX = '_expand'

interface DateTimeValue {
    target: Record<string, unknown>
    key: string
    kind: DateTimeKind
    ownerZone?: string
}

function isTraversable(value: object): boolean {
    return !(value instanceof Date
        || ArrayBuffer.isView(value)
        || value instanceof ArrayBuffer
        || value instanceof Map
        || value instanceof Set
        || value instanceof Promise
        || value instanceof RegExp
        || value instanceof Error
        || value instanceof StreamableFile
        || typeof (value as {pipe?: unknown}).pipe == 'function')
}

function collect(
    value: unknown,
    timezone: RequestTimezone,
    ownerZone: string | undefined,
    found: DateTimeValue[],
    seen: WeakSet<object>,
    depth: number,
): void {
    if (value == null || typeof value != 'object' || depth > MAX_DEPTH || seen.has(value) || !isTraversable(value))
        return
    seen.add(value)
    if (Array.isArray(value)) {
        value.forEach(item => collect(item, timezone, ownerZone, found, seen, depth + 1))
        return
    }
    const item = value as Record<string | symbol, unknown>
    const zone = timezone.isOwner && typeof item[OWNER_TIMEZONE] == 'string'
        ? item[OWNER_TIMEZONE] as string
        : ownerZone
    const fields = dateTimeFields(value)
    for (const key of Object.keys(item)) {
        const kind = fields?.get(key)
        if (kind)
            found.push({target: item, key, kind, ownerZone: zone})
        else
            collect(item[key], timezone, key.endsWith(EXPANDED_SUFFIX) ? undefined : zone, found, seen, depth + 1)
    }
}

/**
 * Renders the date/time fields of response DTOs (@DateTimeField, @LocalDateTimeField) in place, after the
 * response validation: instants as RFC 3339 in the request's zone (for tz=owner the nearest owner zone of the
 * item or its parents, not across expand= objects), local values as stored; invalid and zero dates become null.
 * The user's zone is only looked up when an instant needs it.
 */
export async function renderDateTimes(data: unknown, timezone: RequestTimezone): Promise<void> {
    const found: DateTimeValue[] = []
    collect(data, timezone, undefined, found, new WeakSet(), 0)
    const needsDefaultZone = found.some(({target, key, kind, ownerZone}) =>
        kind == DateTimeKind.DateTime && !ownerZone && target[key] != null)
    const defaultZone = needsDefaultZone ? await timezone.defaultZone() : undefined
    for (const {target, key, kind, ownerZone} of found) {
        const value = target[key]
        if (value == null)
            continue
        switch (kind) {
            case DateTimeKind.DateTime:
                target[key] = formatDateTime(value, ownerZone ?? defaultZone)
                break
            case DateTimeKind.LocalDateTime:
                target[key] = formatLocalDateTime(value)
                break
            case DateTimeKind.LocalTime:
                target[key] = formatLocalTime(value)
                break
        }
    }
}
