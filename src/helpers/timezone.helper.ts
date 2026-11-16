import {Request} from 'express'
import {ObjectLiteral, SelectQueryBuilder} from 'typeorm'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import Context from '~/helpers/context.helper'
import {toLocalDateTime} from '~/helpers/date.helper'
import {InvalidParameterException, errorMessage} from '~/helpers/errors.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {TimezoneRepository} from '~/repositories/timezone.repository'

export const TZ_PARAM = 'tz'
export const TZ_OWNER = 'owner'

/**
 * Zone of an item for `tz=owner`, a non-serialized property of a response DTO set by resources with owner
 * support. The nearest one wins, so expanded objects use their own owner's zone.
 */
export const OWNER_TIMEZONE = Symbol('ownerTimezone')

const OWNER_TIMEZONE_ALIAS = 'owner_timezone'

const log = new LoggerService('TimezoneHelper')

const utcZones = new Set([
    'UTC',
    'Etc/UTC',
    'Etc/UCT',
    'Etc/Universal',
    'Etc/Zulu',
    'UCT',
    'Universal',
    'Zulu',
])

// stored names that mean the platform zone (MariaDB SYSTEM, the system's localtime)
const platformZoneNames = [
    'localtime',
    'system',
]

/**
 * IANA zone name as resolved by Temporal (case-normalized), undefined for anything else, also offsets
 */
export function canonicalTimezone(name: string): string | undefined {
    if (!/^[A-Za-z]/.test(name))
        return undefined
    try {
        return Temporal.Now.instant().toZonedDateTimeISO(name).timeZoneId
    } catch {
        return undefined
    }
}

/**
 * The platform zone: the process zone, which is the zone of MariaDB's SYSTEM and of naive DB values
 */
export function platformTimezone(): string {
    return Temporal.Now.timeZoneId()
}

/**
 * Zone of a stored name (contacts.timezone through the owner chain): 'localtime'/'SYSTEM' and missing values
 * are the platform zone, invalid names too (logged)
 */
export function storedTimezone(name: string | null | undefined): string {
    if (name == null || platformZoneNames.includes(name.toLowerCase()))
        return platformTimezone()
    const zone = canonicalTimezone(name)
    if (zone)
        return zone
    log.warn(`invalid stored timezone '${name}', using the platform timezone`)
    return platformTimezone()
}

/**
 * Whether the request asks for tz=owner (the parameter is validated by TimezoneMiddleware)
 */
export function isOwnerTimezone(sr: ServiceRequest): boolean {
    return sr.query?.[TZ_PARAM] === TZ_OWNER
}

/**
 * tz=owner: maps the owner zone of the contract (billing.v_contract_timezone, joined on the contract id
 * expression) to `ownerTimezone` of the main alias. A left join of the view keeps getCount() correct.
 */
export function joinContractTimezone(qb: SelectQueryBuilder<ObjectLiteral>, contractId: string): void {
    qb.leftJoinAndMapOne(
        `${qb.alias}.ownerTimezone`,
        db.billing.VContractTimezone,
        OWNER_TIMEZONE_ALIAS,
        `${OWNER_TIMEZONE_ALIAS}.contract_id = ${contractId}`,
    )
}

/**
 * Sets the owner zone of a response DTO for tz=owner (non-enumerable, never serialized); no-op without one
 */
export function setOwnerTimezone(dto: object, zone: string | undefined): void {
    if (zone)
        Object.defineProperty(dto, OWNER_TIMEZONE, {value: zone, configurable: true, writable: true})
}

/**
 * Value of the tz query parameter: an IANA zone name, 'owner' or undefined; 400 for anything else
 */
export function parseTimezoneParam(value: unknown): string | undefined {
    if (value === undefined)
        return undefined
    if (value === TZ_OWNER)
        return TZ_OWNER
    const zone = typeof value == 'string' ? canonicalTimezone(value) : undefined
    if (zone)
        return zone
    const error = errorMessage('INVALID_TIMEZONE')
    throw new InvalidParameterException([{parameter: TZ_PARAM, code: error.errorCode, message: error.message}])
}

function epochMilliseconds(value: unknown): number | undefined {
    const ms = value instanceof Date
        ? value.getTime()
        : typeof value == 'string' || typeof value == 'number'
            ? new Date(value).getTime()
            : NaN
    return Number.isFinite(ms) ? ms : undefined
}

/**
 * RFC 3339 in the zone, with its offset and 3 fractional digits ('Z' for UTC); null for invalid and zero dates
 */
export function formatDateTime(value: unknown, zone: string): string | null {
    const ms = epochMilliseconds(value)
    if (ms === undefined)
        return null
    const instant = Temporal.Instant.fromEpochMilliseconds(ms)
    return utcZones.has(zone)
        ? instant.toString({fractionalSecondDigits: 3})
        : instant.toZonedDateTimeISO(zone).toString({timeZoneName: 'never', fractionalSecondDigits: 3})
}

/**
 * Platform wall clock as stored, 'YYYY-MM-DD HH:MM:SS' without offset; null for invalid and zero dates.
 * Naive DB values are read in the process zone, the local getters return them unchanged.
 */
export function formatLocalDateTime(value: unknown): string | null {
    const ms = epochMilliseconds(value)
    if (ms === undefined)
        return null
    return toLocalDateTime(new Date(ms))
}

/**
 * Platform wall clock time 'HH:MM:SS'; time strings are kept, null for invalid dates
 */
export function formatLocalTime(value: unknown): string | null {
    if (typeof value == 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value))
        return value
    const dateTime = formatLocalDateTime(value)
    return dateTime == null ? null : dateTime.slice(11)
}

/**
 * Zone of the authenticated user: subscriber roles by their subscriber's chain, admins by their reseller
 * (billing.admins.reseller_id), admins without a reseller and unauthenticated requests the platform zone
 */
export async function resolveUserTimezone(
    user: AuthResponseDto | undefined,
    repo: Pick<TimezoneRepository, 'readSubscriberTimezone' | 'readResellerTimezone'> = new TimezoneRepository(),
): Promise<string> {
    if (!user)
        return platformTimezone()
    if (user.role == RbacRole.subscriber || user.role == RbacRole.subscriberadmin)
        return storedTimezone(await repo.readSubscriberTimezone(user.id))
    if (user.reseller_id != null)
        return storedTimezone(await repo.readResellerTimezone(user.reseller_id))
    return platformTimezone()
}

/**
 * Timezone context of a request: the validated tz parameter and the user's zone, resolved once and only
 * when needed
 */
export class RequestTimezone {
    private userZone?: Promise<string>
    private resolvedUserZone?: string

    constructor(
        private readonly req: Request,
        readonly param: string | undefined,
    ) {
    }

    get isOwner(): boolean {
        return this.param == TZ_OWNER
    }

    /**
     * Zone of `tz=<IANA>`, undefined without tz or with tz=owner
     */
    get zone(): string | undefined {
        return this.isOwner ? undefined : this.param
    }

    /**
     * Zone of values without an own owner zone: tz=<IANA>, else the user's zone
     */
    defaultZone(): Promise<string> {
        if (this.zone)
            return Promise.resolve(this.zone)
        this.userZone ??= resolveUserTimezone(this.req.user as AuthResponseDto | undefined)
            .then(zone => this.resolvedUserZone = zone)
        return this.userZone
    }

    /**
     * defaultZone() for synchronous input parsing; the user's zone must have been resolved before
     * (TimezoneInterceptor)
     */
    resolvedDefaultZone(): string {
        const zone = this.zone ?? this.resolvedUserZone
        if (zone === undefined)
            throw new Error('the user\'s timezone has not been resolved')
        return zone
    }
}

/**
 * Timezone context of the request, bound by TimezoneMiddleware (created on first use without it)
 */
export function requestTimezone(req: Request): RequestTimezone {
    const ctx = Context.get(req)
    if (ctx?.timezone)
        return ctx.timezone
    const timezone = new RequestTimezone(req, parseTimezoneParam(req.query?.[TZ_PARAM]))
    if (ctx)
        ctx.timezone = timezone
    return timezone
}
