import {
    InvoiceCallRow,
    InvoiceCallSide,
    InvoiceCdrContractType,
    InvoiceContract,
    InvoiceCostCategory,
    InvoiceDidZoneRow,
    InvoiceZoneRow,
} from './interfaces/invoice-data.interface'

import {
    InvoiceTemplateBillingProfileVars,
    InvoiceTemplateCallVars,
    InvoiceTemplateContactVars,
    InvoiceTemplateCustomerVars,
    InvoiceTemplateDidZoneVars,
    InvoiceTemplateInvoiceVars,
    InvoiceTemplateZoneVars,
    InvoiceTemplateZonesVars,
} from '~/api/templates/invoices/dto/invoice-vars.dto'
import {InvoiceTemplateVars, callDirectionLabel, zonesTotal} from '~/api/templates/invoices/invoice-template.vars'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {CallListSuppression, suppressNumber} from '~/helpers/call-list-suppression.helper'
import {toLocalDateTime} from '~/helpers/date.helper'

/**
 * Pure functions of the invoice creation (periods, serial, zones, amounts, template variables)
 */

/**
 * Contract classes (product classes) an invoice template category can be used for
 */
export const invoiceContractClasses: Record<InvoiceTemplateCategory, ProductClass[]> = {
    [InvoiceTemplateCategory.Customer]: [ProductClass.SipAccount, ProductClass.PbxAccount],
    [InvoiceTemplateCategory.Did]: [ProductClass.SipAccount, ProductClass.PbxAccount],
    [InvoiceTemplateCategory.Peer]: [ProductClass.SipPeering, ProductClass.PstnPeering],
    [InvoiceTemplateCategory.Reseller]: [ProductClass.Reseller],
}

export const invoiceCostCategory: Record<InvoiceTemplateCategory, InvoiceCostCategory> = {
    [InvoiceTemplateCategory.Customer]: InvoiceCostCategory.Customer,
    [InvoiceTemplateCategory.Did]: InvoiceCostCategory.Customer,
    [InvoiceTemplateCategory.Peer]: InvoiceCostCategory.Carrier,
    [InvoiceTemplateCategory.Reseller]: InvoiceCostCategory.Reseller,
}

export const invoiceCdrContractType: Record<InvoiceTemplateCategory, InvoiceCdrContractType> = {
    [InvoiceTemplateCategory.Customer]: InvoiceCdrContractType.Account,
    [InvoiceTemplateCategory.Did]: InvoiceCdrContractType.Account,
    [InvoiceTemplateCategory.Peer]: InvoiceCdrContractType.Provider,
    [InvoiceTemplateCategory.Reseller]: InvoiceCdrContractType.Provider,
}

const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/**
 * Parses 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM[:SS]' in server local time, Invalid Date if it is not a valid date
 */
export function parseLocalDateTime(value: string): Date {
    const m = dateTimePattern.exec(value)
    if (!m)
        return new Date(NaN)
    const [year, month, day, hour, minute, second] = m.slice(1).map(v => Number(v ?? 0))
    const date = new Date(year, month - 1, day, hour, minute, second)
    const valid = date.getFullYear() == year && date.getMonth() == month - 1 && date.getDate() == day &&
        date.getHours() == hour && date.getMinutes() == minute && date.getSeconds() == second
    return valid ? date : new Date(NaN)
}

/**
 * Invoice period in server local time: a calendar month ('YYYY-MM') or period_start [+ period_end],
 * period_start takes precedence; without period_end the period ends 1 second before start + 1 month
 */
export function invoicePeriod(period?: string, periodStart?: string, periodEnd?: string): {start?: Date, end?: Date} {
    let start: Date | undefined
    if (periodStart) {
        start = parseLocalDateTime(periodStart)
    } else if (period) {
        start = parseLocalDateTime(`${period}-01`)
    }
    if (!start)
        return {}
    const end = periodEnd
        ? parseLocalDateTime(periodEnd)
        : new Date(start.getFullYear(), start.getMonth() + 1, start.getDate(),
            start.getHours(), start.getMinutes(), start.getSeconds() - 1)
    return {start, end}
}

/**
 * Serial INV<YYYY><MM><id, 7 digits> of the period start in server local time
 */
export function invoiceSerial(id: number, periodStart: Date): string {
    const year = String(periodStart.getFullYear()).padStart(4, '0')
    const month = String(periodStart.getMonth() + 1).padStart(2, '0')
    return `INV${year}${month}${String(id).padStart(7, '0')}`
}

const showsCarrierCost = (role: string): boolean => role == RbacRole.admin || role == RbacRole.system
const showsResellerCost = (role: string): boolean => showsCarrierCost(role) || role == RbacRole.reseller

/**
 * Merges the zone rows by "zone zone_detail" (incoming and outgoing calls of the same zone are summed up),
 * sorted by zone and detail; the carrier cost is only kept for admin and system users, the reseller cost
 * also for reseller users
 */
export function mergeZones(rows: InvoiceZoneRow[], role: string): InvoiceTemplateZoneVars[] {
    const zones = new Map<string, InvoiceTemplateZoneVars>()
    for (const row of rows) {
        const key = `${row.zone ?? ''} ${row.zoneDetail ?? ''}`
        let zone = zones.get(key)
        if (!zone) {
            zone = new InvoiceTemplateZoneVars({
                zone: row.zone ?? '',
                zone_detail: row.zoneDetail ?? '',
                customercost: 0,
                resellercost: 0,
                carriercost: 0,
                duration: 0,
                free_time: 0,
                number: 0,
            })
            zones.set(key, zone)
        }
        zone.customercost += row.customerCost
        zone.resellercost += row.resellerCost
        zone.carriercost += row.carrierCost
        zone.duration += row.duration
        zone.free_time += row.freeTime
        zone.number += row.number
    }
    const keys = [...zones.keys()].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
    return keys.map(key => {
        const zone = zones.get(key)
        if (!showsCarrierCost(role))
            delete zone.carriercost
        if (!showsResellerCost(role))
            delete zone.resellercost
        return zone
    })
}

/**
 * Zones per did subscriber, in the order of the rows (one block per subscriber with calls)
 */
export function didZones(rows: InvoiceDidZoneRow[], role: string, category: InvoiceTemplateCategory): InvoiceTemplateDidZoneVars[] {
    const subscribers = new Map<number, InvoiceDidZoneRow[]>()
    for (const row of rows) {
        if (!subscribers.has(row.subscriberId))
            subscribers.set(row.subscriberId, [])
        subscribers.get(row.subscriberId).push(row)
    }
    return [...subscribers.values()].map(subscriberRows => {
        const total = zonesTotal(mergeZones(subscriberRows, role), category)
        return new InvoiceTemplateDidZoneVars({
            totalcost: total.totalcost,
            totalduration: total.totalduration,
            data: total.data,
        })
    })
}

/**
 * Call list ordered by start time: '%23' is shown as '#', the suppressions of the called number
 * (outgoing calls) and of the calling number (incoming calls) are applied
 */
export function invoiceCalls(
    rows: InvoiceCallRow[],
    suppressions: Map<number, CallListSuppression>,
    showSuppressions: boolean,
): InvoiceTemplateCallVars[] {
    const sorted = [...rows].sort((a, b) => a.startTime - b.startTime)
    return sorted.map(row => {
        const suppression = row.suppressionId != null ? suppressions.get(row.suppressionId) : undefined
        let sourceCli = row.sourceCli
        let destinationUserIn = row.destinationUserIn.replace(/%23/g, '#')
        if (row.side == InvoiceCallSide.Source)
            destinationUserIn = suppressNumber(destinationUserIn, suppression, showSuppressions)
        else
            sourceCli = suppressNumber(sourceCli, suppression, showSuppressions)
        return new InvoiceTemplateCallVars({
            source_user: row.sourceUser,
            source_domain: row.sourceDomain,
            source_cli: sourceCli,
            destination_user_in: destinationUserIn,
            start_time: Math.floor(row.startTime),
            duration: row.duration,
            call_type: row.callType,
            cost: row.cost,
            zone: row.zone ?? '',
            zone_detail: row.zoneDetail ?? '',
        })
    })
}

export interface InvoiceAmounts {
    amountNet: number
    amountVat: number
    amountTotal: number
}

/**
 * Amounts in cents: the net amount is the zone total of the category (as v1)
 */
export function invoiceAmounts(zones: InvoiceTemplateZonesVars, contract: internal.Contract): InvoiceAmounts {
    // TODO: interval_charge, v1 never added the billing profile interval_charge (INVOICES-BACKLOG P1)
    const amountNet = zones.totalcost
    const amountVat = contract.add_vat ? amountNet * (contract.vat_rate ?? 0) / 100 : 0
    return {amountNet, amountVat, amountTotal: amountNet + amountVat}
}

const regionNames = new Intl.DisplayNames(['en'], {type: 'region', fallback: 'none'})

/**
 * Country name of an ISO 3166 country code, null if unknown
 */
export function countryName(code?: string | null): string | null {
    if (!code)
        return null
    try {
        return regionNames.of(code.toUpperCase()) ?? null
    } catch {
        return null
    }
}

function contactVars(contact?: internal.Contact): InvoiceTemplateContactVars {
    const vars = new InvoiceTemplateContactVars()
    const values = vars as unknown as Record<string, unknown>
    for (const key of Object.keys(vars))
        values[key] = contact?.[key] ?? null
    vars.country = countryName(contact?.country)
    return vars
}

/**
 * The template periods are printed in UTC, so the local wall clock is passed as UTC time
 */
function wallClockIso(date: Date): string {
    return `${toLocalDateTime(date).replace(' ', 'T')}.000Z`
}

export interface InvoiceVarsData {
    contract: InvoiceContract
    billingProfile: internal.BillingProfile
    serial: string
    periodStart: Date
    periodEnd: Date
    amounts: InvoiceAmounts
    callDirection: InvoiceTemplateCallDirection
    zones: InvoiceTemplateZonesVars
    calls?: InvoiceTemplateCallVars[]
    didZones?: InvoiceTemplateDidZoneVars[]
}

/**
 * Variables of the invoice template
 */
export function invoiceTemplateVars(data: InvoiceVarsData): InvoiceTemplateVars {
    const {contract, billingProfile: profile} = data
    const vars: InvoiceTemplateVars = {
        rescontact: contactVars(contract.resellerContact),
        customer: new InvoiceTemplateCustomerVars({
            id: contract.contract.id,
            external_id: contract.contract.external_id ?? null,
            vat_rate: contract.contract.vat_rate,
        }),
        custcontact: contactVars(contract.contact),
        billprof: new InvoiceTemplateBillingProfileVars({
            id: profile.id,
            handle: profile.handle,
            name: profile.name,
            prepaid: !!profile.prepaid,
            interval_charge: profile.intervalCharge,
            interval_free_time: profile.intervalFreeTime,
            interval_free_cash: profile.intervalFreeCash,
            interval_unit: profile.intervalUnit,
            interval_count: profile.intervalCount,
            currency: profile.currency ?? null,
        }),
        invoice: new InvoiceTemplateInvoiceVars({
            period_start: wallClockIso(data.periodStart),
            period_end: wallClockIso(data.periodEnd),
            serial: data.serial,
            amount_net: data.amounts.amountNet,
            amount_vat: data.amounts.amountVat,
            amount_total: data.amounts.amountTotal,
            call_direction: callDirectionLabel[data.callDirection] ?? '',
        }),
        zones: data.zones,
    }
    if (data.calls)
        vars.calls = data.calls
    if (data.didZones)
        vars.did_zones = data.didZones
    return vars
}
