import {NotFoundException} from '@nestjs/common'

import {FilterBy} from './invoice.mariadb.repository'

import {
    InvoiceCallRow,
    InvoiceCdrQuery,
    InvoiceContract,
    InvoiceDidZoneRow,
    InvoiceZoneRow,
} from '~/api/invoices/interfaces/invoice-data.interface'
import {InvoiceRepository} from '~/api/invoices/interfaces/invoice.repository'
import {internal} from '~/entities'
import {CallListSuppression} from '~/helpers/call-list-suppression.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class InvoiceMockRepository implements InvoiceRepository {
    readonly invoiceDB: {[key: number]: internal.Invoice & {resellerId?: number}} = {}
    readonly contractDB: {[key: number]: InvoiceContract} = {}
    zones: InvoiceZoneRow[] = []
    billingProfile: internal.BillingProfile | undefined = Object.assign(new internal.BillingProfile(), {id: 1, handle: 'h', name: 'n'})
    didZoneRows: InvoiceDidZoneRow[] = []
    calls: InvoiceCallRow[] = []
    suppressions: CallListSuppression[] = []
    private nextId = 1

    private visible(filterBy?: FilterBy): internal.Invoice[] {
        return Object.values(this.invoiceDB).filter(i => !filterBy?.resellerId || i.resellerId == filterBy.resellerId)
    }

    async readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.Invoice[], number]> {
        const rows = this.visible(filterBy)
        return [rows, rows.length]
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Invoice> {
        const invoice = this.visible(filterBy).find(i => i.id == id)
        if (!invoice)
            throw new NotFoundException()
        return invoice
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Invoice[]> {
        return this.visible(filterBy).filter(i => ids.includes(i.id))
    }

    async readDataById(id: number, filterBy?: FilterBy): Promise<internal.Invoice> {
        return await this.readById(id, undefined, filterBy)
    }

    async create(invoice: internal.Invoice): Promise<number> {
        const id = this.nextId++
        this.invoiceDB[id] = Object.assign(new internal.Invoice(), invoice, {id})
        return id
    }

    async update(id: number, invoice: internal.Invoice): Promise<void> {
        this.invoiceDB[id].serial = invoice.serial
        this.invoiceDB[id].data = invoice.data
    }

    async readContract(contractId: number): Promise<InvoiceContract | undefined> {
        return this.contractDB[contractId]
    }

    async readActualBillingProfile(_contract: internal.Contract, _at: Date): Promise<internal.BillingProfile | undefined> {
        return this.billingProfile
    }

    async readZones(_q: InvoiceCdrQuery): Promise<InvoiceZoneRow[]> {
        return this.zones
    }

    async readDidZones(_q: InvoiceCdrQuery): Promise<InvoiceDidZoneRow[]> {
        return this.didZoneRows
    }

    async readCalls(_q: InvoiceCdrQuery, _showSuppressions: boolean): Promise<InvoiceCallRow[]> {
        return this.calls
    }

    async readCallListSuppressions(ids: number[]): Promise<CallListSuppression[]> {
        return this.suppressions.filter(s => ids.includes(s.id))
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        ids.forEach(id => delete this.invoiceDB[id])
        return ids
    }
}
