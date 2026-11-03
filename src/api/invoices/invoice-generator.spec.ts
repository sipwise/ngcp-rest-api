import {InvoiceCallRow, InvoiceCallSide, InvoiceDidZoneRow, InvoiceZoneRow} from './interfaces/invoice-data.interface'
import {
    countryName,
    didZones,
    invoiceAmounts,
    invoiceCalls,
    invoicePeriod,
    invoiceSerial,
    invoiceTemplateVars,
    mergeZones,
    parseLocalDateTime,
} from './invoice-generator'

import {zonesTotal} from '~/api/templates/invoices/invoice-template.vars'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {CallListSuppression, CallListSuppressionMode} from '~/helpers/call-list-suppression.helper'

const zoneRow = (zone: string | null, detail: string | null, cost: number, values: Partial<InvoiceZoneRow> = {}): InvoiceZoneRow => ({
    zone: zone,
    zoneDetail: detail,
    customerCost: cost,
    resellerCost: cost / 2,
    carrierCost: cost / 4,
    freeTime: 0,
    duration: 60,
    number: 1,
    ...values,
})

const callRow = (side: InvoiceCallSide, startTime: number, values: Partial<InvoiceCallRow> = {}): InvoiceCallRow => ({
    side: side,
    sourceUser: 'user',
    sourceDomain: 'example.org',
    sourceCli: '431111',
    destinationUserIn: '432222',
    startTime: startTime,
    duration: 30.5,
    callType: 'call',
    cost: 12.5,
    zone: 'Zone',
    zoneDetail: 'Detail',
    suppressionId: null,
    ...values,
})

const contract = (addVat: boolean, vatRate: number): internal.Contract =>
    internal.Contract.create({id: 7, status: undefined, add_vat: addVat, vat_rate: vatRate, external_id: 'ext'})

describe('invoice generator', () => {
    describe('period', () => {
        it('parses local dates', () => {
            expect(parseLocalDateTime('2026-03-29')).toEqual(new Date(2026, 2, 29))
            expect(parseLocalDateTime('2026-03-29 02:30:00').getTime()).toBeNaN() // DST gap in CET
            expect(parseLocalDateTime('2026-10-25 02:30:00')).toEqual(new Date(2026, 9, 25, 2, 30, 0))
            expect(parseLocalDateTime('2026-01-31T23:59')).toEqual(new Date(2026, 0, 31, 23, 59, 0))
        })
        it.each(['2026-02-30', '2026-13-01', '2026-01-01 24:00:00', '2026-1-1', 'x'])('rejects %s', value => {
            expect(parseLocalDateTime(value).getTime()).toBeNaN()
        })
        it('covers the calendar month of period', () => {
            expect(invoicePeriod('2026-02')).toEqual({start: new Date(2026, 1, 1), end: new Date(2026, 1, 28, 23, 59, 59)})
            expect(invoicePeriod('2026-12')).toEqual({start: new Date(2026, 11, 1), end: new Date(2026, 11, 31, 23, 59, 59)})
        })
        it('ends 1 second before period_start + 1 month', () => {
            expect(invoicePeriod(undefined, '2026-01-15 12:00:00')).toEqual({
                start: new Date(2026, 0, 15, 12, 0, 0),
                end: new Date(2026, 1, 15, 11, 59, 59),
            })
        })
        it('prefers period_start and takes period_end', () => {
            expect(invoicePeriod('2026-05', '2026-01-01', '2026-01-10 00:00:00')).toEqual({
                start: new Date(2026, 0, 1),
                end: new Date(2026, 0, 10),
            })
        })
        it('is empty without period and period_start', () => {
            expect(invoicePeriod(undefined, undefined, '2026-01-10')).toEqual({})
        })
    })

    describe('serial', () => {
        it('uses the local year and month of the period start', () => {
            expect(invoiceSerial(42, new Date(2026, 0, 1))).toEqual('INV2026010000042')
            expect(invoiceSerial(12345678, new Date(2026, 11, 31, 23, 59, 59))).toEqual('INV20261212345678')
        })
        it('is not shifted by the UTC offset at the CET month boundary', () => {
            // 2026-02-01 00:00 CET is 2026-01-31 23:00 UTC
            const start = new Date(2026, 1, 1)
            expect(start.toISOString()).toEqual('2026-01-31T23:00:00.000Z')
            expect(invoiceSerial(1, start)).toEqual('INV2026020000001')
        })
    })

    describe('zones', () => {
        const rows = [
            zoneRow('B', 'b', 100),
            zoneRow('A', 'a', 10),
            zoneRow('B', 'b', 50, {duration: 30, number: 2, freeTime: 5}),
            zoneRow(null, null, 0),
        ]
        it('merges the zones by zone and detail, sorted', () => {
            const zones = mergeZones(rows, RbacRole.admin)
            expect(zones.map(z => [z.zone, z.zone_detail])).toEqual([['', ''], ['A', 'a'], ['B', 'b']])
            expect(zones[2]).toEqual(expect.objectContaining({
                customercost: 150, resellercost: 75, carriercost: 37.5, duration: 90, number: 3, free_time: 5,
            }))
        })
        it.each([
            [RbacRole.admin, true, true],
            [RbacRole.system, true, true],
            [RbacRole.reseller, false, true],
            [RbacRole.ccare, false, false],
        ])('cost fields for %s', (role, carrier, reseller) => {
            const [zone] = mergeZones([zoneRow('A', 'a', 10)], role)
            expect('carriercost' in zone).toBe(carrier)
            expect('resellercost' in zone).toBe(reseller)
            expect(zone.customercost).toEqual(10)
        })
        it.each([
            [InvoiceTemplateCategory.Customer, 160],
            [InvoiceTemplateCategory.Did, 160],
            [InvoiceTemplateCategory.Reseller, 80],
            [InvoiceTemplateCategory.Peer, 40],
        ])('totals the cost of category %s', (category, total) => {
            const zones = zonesTotal(mergeZones(rows, RbacRole.admin), category)
            expect(zones.totalcost).toEqual(total)
            expect(zones.totalduration).toEqual(210)
        })
        it('groups the did zones per subscriber', () => {
            const didRows: InvoiceDidZoneRow[] = [
                {...zoneRow('A', 'a', 10), subscriberId: 3},
                {...zoneRow('B', 'b', 20), subscriberId: 3},
                {...zoneRow('A', 'a', 5), subscriberId: 9},
            ]
            const dids = didZones(didRows, RbacRole.admin, InvoiceTemplateCategory.Did)
            expect(dids.map(d => [d.totalcost, d.totalduration, d.data.length])).toEqual([[30, 120, 2], [5, 60, 1]])
        })
    })

    describe('calls', () => {
        const suppressions = new Map<number, CallListSuppression>([
            [1, {id: 1, label: 'secret', mode: CallListSuppressionMode.Obfuscate}],
            [2, {id: 2, label: 'hidden', mode: CallListSuppressionMode.Filter}],
        ])
        it('orders by start time and replaces %23', () => {
            const calls = invoiceCalls([
                callRow(InvoiceCallSide.Source, 200, {destinationUserIn: '%23123%23'}),
                callRow(InvoiceCallSide.Destination, 100.75, {zone: null, zoneDetail: null}),
            ], suppressions, true)
            expect(calls.map(c => c.start_time)).toEqual([100, 200])
            expect(calls[1].destination_user_in).toEqual('#123#')
            expect(calls[0]).toEqual(expect.objectContaining({zone: '', zone_detail: '', cost: 12.5, duration: 30.5}))
        })
        it('appends the suppression of the called number of outgoing calls', () => {
            const [obfuscated, filtered] = invoiceCalls([
                callRow(InvoiceCallSide.Source, 1, {suppressionId: 1}),
                callRow(InvoiceCallSide.Source, 2, {suppressionId: 2}),
            ], suppressions, true)
            expect(obfuscated.destination_user_in).toEqual('432222 (obfuscated: secret)')
            expect(obfuscated.source_cli).toEqual('431111')
            expect(filtered.destination_user_in).toEqual('432222 (filtered: hidden)')
        })
        it('appends the suppression of the calling number of incoming calls', () => {
            const [call] = invoiceCalls([callRow(InvoiceCallSide.Destination, 1, {suppressionId: 1})], suppressions, true)
            expect(call.source_cli).toEqual('431111 (obfuscated: secret)')
            expect(call.destination_user_in).toEqual('432222')
        })
        it('replaces obfuscated numbers when suppressions are not shown', () => {
            const [call] = invoiceCalls([callRow(InvoiceCallSide.Source, 1, {suppressionId: 1})], suppressions, false)
            expect(call.destination_user_in).toEqual('secret')
        })
    })

    describe('amounts', () => {
        const zones = zonesTotal(mergeZones([zoneRow('A', 'a', 1000.5)], RbacRole.admin), InvoiceTemplateCategory.Customer)
        it('adds the vat', () => {
            expect(invoiceAmounts(zones, contract(true, 20))).toEqual({amountNet: 1000.5, amountVat: 200.1, amountTotal: 1200.6})
        })
        it('has no vat without add_vat', () => {
            expect(invoiceAmounts(zones, contract(false, 20))).toEqual({amountNet: 1000.5, amountVat: 0, amountTotal: 1000.5})
        })
    })

    describe('vars', () => {
        const contact = internal.Contact.create({id: 5, reseller_id: 1, company: 'ACME <&>', country: 'at'})
        const resellerContact = internal.Contact.create({id: 6, company: 'Reseller', country: 'XX'})
        const profile = internal.BillingProfile.create({
            id: 3, handle: 'h', name: 'n', status: undefined, prepaidLibrary: undefined, prepaid: false,
            intervalCharge: 2990, intervalFreeTime: 0, intervalFreeCash: 0, intervalCount: 1, currency: 'EUR',
        })
        const zones = zonesTotal(mergeZones([zoneRow('A', 'a', 100)], RbacRole.admin), InvoiceTemplateCategory.Customer)
        const vars = invoiceTemplateVars({
            contract: {contract: contract(true, 20), productClass: ProductClass.SipAccount, contact: contact, resellerContact: resellerContact},
            billingProfile: profile,
            serial: 'INV2026020000001',
            periodStart: new Date(2026, 1, 1),
            periodEnd: new Date(2026, 1, 28, 23, 59, 59),
            amounts: invoiceAmounts(zones, contract(true, 20)),
            callDirection: InvoiceTemplateCallDirection.InOut,
            zones: zones,
            calls: [],
        })
        it('fills the contacts without example values', () => {
            expect(vars.custcontact).toEqual(expect.objectContaining({id: 5, company: 'ACME <&>', country: 'Austria', firstname: null, gpp0: null}))
            expect(vars.rescontact).toEqual(expect.objectContaining({id: 6, company: 'Reseller', country: null, email: null}))
        })
        it('fills the empty reseller contact with nulls', () => {
            const v = invoiceTemplateVars({
                contract: {contract: contract(false, 0), productClass: ProductClass.Reseller, contact: contact},
                billingProfile: profile, serial: 's', periodStart: new Date(), periodEnd: new Date(), amounts: invoiceAmounts(zones, contract(false, 0)),
                callDirection: InvoiceTemplateCallDirection.Out, zones: zones,
            })
            expect(Object.values(v.rescontact).every(value => value === null)).toBe(true)
            expect(v.calls).toBeUndefined()
            expect(v.did_zones).toBeUndefined()
        })
        it('passes the periods as local wall clock', () => {
            expect(vars.invoice.period_start).toEqual('2026-02-01T00:00:00.000Z')
            expect(vars.invoice.period_end).toEqual('2026-02-28T23:59:59.000Z')
        })
        it('fills customer, billing profile and invoice', () => {
            expect(vars.customer).toEqual(expect.objectContaining({id: 7, external_id: 'ext', vat_rate: 20}))
            expect(vars.billprof).toEqual(expect.objectContaining({id: 3, interval_charge: 2990, currency: 'EUR', prepaid: false}))
            expect(vars.invoice).toEqual(expect.objectContaining({
                serial: 'INV2026020000001', amount_net: 100, amount_vat: 20, amount_total: 120, call_direction: 'from/to',
            }))
            expect(vars.calls).toEqual([])
        })
        it('maps country codes to names', () => {
            expect(countryName('de')).toEqual('Germany')
            expect(countryName('XX')).toBeNull()
            expect(countryName(null)).toBeNull()
        })
    })
})
