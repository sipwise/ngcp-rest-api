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
import {formatDateTime} from '~/helpers/timezone.helper'

/**
 * Pure functions of the invoice creation (periods, serial, zones, amounts, template variables); the zone
 * arguments are the billing zone of the contract (billingTimezone)
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

/**
 * Invoice period: a calendar month ('YYYY-MM') in the billing zone or period_start [+ period_end] (platform
 * time), period_start takes precedence; without period_end the period ends 1 second before start + 1 month
 */
export function invoicePeriod(zone: string, period?: string, periodStart?: Date, periodEnd?: Date): {start?: Date, end?: Date} {
    let start: Date | undefined
    let end: Date | undefined
    if (periodStart) {
        start = periodStart
        end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate(),
            start.getHours(), start.getMinutes(), start.getSeconds() - 1)
    } else if (period) {
        const month = Temporal.PlainYearMonth.from(period)
        const startOfMonth = (m: Temporal.PlainYearMonth): Temporal.ZonedDateTime =>
            m.toPlainDate({day: 1}).toZonedDateTime(zone)
        start = new Date(startOfMonth(month).epochMilliseconds)
        end = new Date(startOfMonth(month.add({months: 1})).subtract({seconds: 1}).epochMilliseconds)
    }
    if (!start)
        return {}
    return {start, end: periodEnd ?? end}
}

/**
 * Serial INV<YYYY><MM><id, 7 digits> of the period start in the billing zone
 */
export function invoiceSerial(id: number, periodStart: Date, zone: string): string {
    const start = Temporal.Instant.fromEpochMilliseconds(periodStart.getTime()).toZonedDateTimeISO(zone)
    const year = String(start.year).padStart(4, '0')
    const month = String(start.month).padStart(2, '0')
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
 * Amounts in cents: the net amount is the zone total of the category
 */
export function invoiceAmounts(zones: InvoiceTemplateZonesVars, contract: internal.Contract): InvoiceAmounts {
    // TODO: add the billing profile interval_charge
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
    // billing zone of the contract
    timezone: string
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
            period_start: formatDateTime(data.periodStart, data.timezone),
            period_end: formatDateTime(data.periodEnd, data.timezone),
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
