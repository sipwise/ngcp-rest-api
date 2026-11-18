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

    readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.Invoice[], number]> {
        const rows = this.visible(filterBy)
        return Promise.resolve([rows, rows.length])
    }

    readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Invoice> {
        const invoice = this.visible(filterBy).find(i => i.id == id)
        if (!invoice)
            throw new NotFoundException()
        return Promise.resolve(invoice)
    }

    readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Invoice[]> {
        return Promise.resolve(this.visible(filterBy).filter(i => ids.includes(i.id)))
    }

    async readDataById(id: number, filterBy?: FilterBy): Promise<internal.Invoice> {
        return await this.readById(id, undefined, filterBy)
    }

    create(invoice: internal.Invoice): Promise<number> {
        const id = this.nextId++
        this.invoiceDB[id] = Object.assign(new internal.Invoice(), invoice, {id})
        return Promise.resolve(id)
    }

    update(id: number, invoice: internal.Invoice): Promise<void> {
        this.invoiceDB[id].serial = invoice.serial
        this.invoiceDB[id].data = invoice.data
        return Promise.resolve()
    }

    readContract(contractId: number): Promise<InvoiceContract | undefined> {
        return Promise.resolve(this.contractDB[contractId])
    }

    readActualBillingProfile(_contract: internal.Contract, _at: Date): Promise<internal.BillingProfile | undefined> {
        return Promise.resolve(this.billingProfile)
    }

    readZones(_q: InvoiceCdrQuery): Promise<InvoiceZoneRow[]> {
        return Promise.resolve(this.zones)
    }

    readDidZones(_q: InvoiceCdrQuery): Promise<InvoiceDidZoneRow[]> {
        return Promise.resolve(this.didZoneRows)
    }

    readCalls(_q: InvoiceCdrQuery, _showSuppressions: boolean): Promise<InvoiceCallRow[]> {
        return Promise.resolve(this.calls)
    }

    readCallListSuppressions(ids: number[]): Promise<CallListSuppression[]> {
        return Promise.resolve(this.suppressions.filter(s => ids.includes(s.id)))
    }

    delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        ids.forEach(id => delete this.invoiceDB[id])
        return Promise.resolve(ids)
    }
}
