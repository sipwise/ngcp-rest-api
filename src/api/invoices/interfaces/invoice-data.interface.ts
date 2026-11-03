import {internal} from '~/entities'
import {InvoiceTemplateCallDirection} from '~/entities/internal/invoice-template.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'

/**
 * Contract of an invoice with its contact and the contact of the reseller's contract
 */
export interface InvoiceContract {
    contract: internal.Contract
    productClass: ProductClass
    contact: internal.Contact
    resellerContact?: internal.Contact
}

export enum InvoiceCdrContractType {
    Account = 'account',
    Provider = 'provider',
}

export enum InvoiceCostCategory {
    Customer = 'customer',
    Reseller = 'reseller',
    Carrier = 'carrier',
}

/**
 * Selection of the cdrs of an invoice
 */
export interface InvoiceCdrQuery {
    contractId: number
    contractType: InvoiceCdrContractType
    costCategory: InvoiceCostCategory
    callDirection: InvoiceTemplateCallDirection
    start: Date
    end: Date
}

/**
 * Cdr aggregate of a zone and zone detail
 */
export interface InvoiceZoneRow {
    zone: string | null
    zoneDetail: string | null
    customerCost: number
    resellerCost: number
    carrierCost: number
    freeTime: number
    duration: number
    number: number
}

export interface InvoiceDidZoneRow extends InvoiceZoneRow {
    subscriberId: number
}

export enum InvoiceCallSide {
    Source = 'source',
    Destination = 'destination',
}

export interface InvoiceCallRow {
    // source: outgoing call of the contract, destination: incoming call
    side: InvoiceCallSide
    sourceUser: string
    sourceDomain: string
    sourceCli: string
    destinationUserIn: string
    startTime: number
    duration: number
    callType: string
    cost: number
    zone: string | null
    zoneDetail: string | null
    suppressionId: number | null
}
