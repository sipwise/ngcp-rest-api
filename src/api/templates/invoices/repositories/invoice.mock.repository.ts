import {NotFoundException} from '@nestjs/common'

import {FilterBy} from './invoice.mariadb.repository'

import {InvoiceTemplateRepository} from '~/api/templates/invoices/interfaces/invoice.repository'
import {internal} from '~/entities'
import {InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class InvoiceTemplateMockRepository implements InvoiceTemplateRepository {
    readonly templateDB: {[key: number]: internal.InvoiceTemplate} = {}
    private nextId = 1

    constructor() {
        // 1: reseller 1 customer, 2: reseller 2 customer, 3: global peer
        this.add({resellerId: 1, name: 'cust1', category: InvoiceTemplateCategory.Customer, data: Buffer.from('<svg>one</svg>')})
        this.add({resellerId: 2, name: 'cust2', category: InvoiceTemplateCategory.Customer})
        this.add({name: 'peer', category: InvoiceTemplateCategory.Peer})
    }

    private add(data: Partial<internal.InvoiceTemplate>): void {
        const id = this.nextId++
        this.templateDB[id] = Object.assign(new internal.InvoiceTemplate(), {type: InvoiceTemplateType.SVG}, data, {id})
    }

    private visible(filterBy?: FilterBy): internal.InvoiceTemplate[] {
        return Object.values(this.templateDB).filter(t => !filterBy?.resellerId || t.resellerId == filterBy.resellerId)
    }

    async create(entities: internal.InvoiceTemplate[]): Promise<number[]> {
        return entities.map(e => {
            const id = this.nextId++
            this.templateDB[id] = Object.assign(new internal.InvoiceTemplate(), e, {id})
            return id
        })
    }

    async readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.InvoiceTemplate[], number]> {
        const rows = this.visible(filterBy)
        return [rows, rows.length]
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.InvoiceTemplate> {
        const template = this.visible(filterBy).find(t => t.id == id)
        if (!template)
            throw new NotFoundException()
        return template
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.InvoiceTemplate[]> {
        return this.visible(filterBy).filter(t => ids.includes(t.id))
    }

    async readByResellerAndName(resellerId: number | null, name: string): Promise<internal.InvoiceTemplate | undefined> {
        return Object.values(this.templateDB).find(t => t.name == name && (resellerId ? t.resellerId == resellerId : !t.resellerId))
    }

    async update(updates: Dictionary<internal.InvoiceTemplate>, _sr: ServiceRequest): Promise<number[]> {
        return Object.keys(updates).map(key => {
            const id = parseInt(key)
            Object.assign(this.templateDB[id], updates[key])
            return id
        })
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        ids.forEach(id => delete this.templateDB[id])
        return ids
    }
}
