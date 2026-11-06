import {
    Inject,
    Injectable,
    NotFoundException,
    StreamableFile,
} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {InvoiceCdrQuery, InvoiceContract} from './interfaces/invoice-data.interface'
import {
    didZones,
    invoiceAmounts,
    invoiceCalls,
    invoiceCdrContractType,
    invoiceContractClasses,
    invoiceCostCategory,
    invoiceSerial,
    invoiceTemplateVars,
    mergeZones,
} from './invoice-generator'
import {FilterBy, InvoiceMariadbRepository} from './repositories/invoice.mariadb.repository'

import {CustomerService} from '~/api/customers/customer.service'
import {zonesTotal} from '~/api/templates/invoices/invoice-template.vars'
import {InvoiceTemplateService} from '~/api/templates/invoices/invoice.service'
import {internal} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'
import {isShowCallListSuppressions} from '~/helpers/call-list-suppression.helper'
import {apiError, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

export const invoiceMimeType = 'application/pdf'

const resellerCategories = [InvoiceTemplateCategory.Customer, InvoiceTemplateCategory.Did]

@Injectable()
export class InvoiceService implements CrudService<internal.Invoice> {
    private readonly log = new LoggerService(InvoiceService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(InvoiceMariadbRepository) private readonly invoiceRepo: InvoiceMariadbRepository,
        @Inject(InvoiceTemplateService) private readonly invoiceTemplateService: InvoiceTemplateService,
        @Inject(CustomerService) private readonly customerService: CustomerService,
    ) {
    }

    async create(invoices: internal.Invoice[], sr: ServiceRequest): Promise<internal.Invoice[]> {
        const created: internal.Invoice[] = []
        for (const [index, invoice] of invoices.entries())
            created.push(await this.createInvoice(invoice, sr, index))
        return created
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Invoice[], number]> {
        return await this.invoiceRepo.readAll(sr, this.getFilterBy(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Invoice> {
        return await this.invoiceRepo.readById(id, sr, this.getFilterBy(sr))
    }

    async readFile(id: number, sr: ServiceRequest): Promise<StreamableFile> {
        const invoice = await this.invoiceRepo.readDataById(id, this.getFilterBy(sr))
        if (!invoice.data?.length)
            throw new NotFoundException()
        const filename = `invoice_${invoice.serial}.pdf`.replace(/["\\\r\n]/g, '_')
        return new StreamableFile(invoice.data, {
            type: invoiceMimeType,
            disposition: `attachment; filename="${filename}"`,
            length: invoice.data.length,
        })
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const invoices = await this.invoiceRepo.readWhereInIds(ids, sr, this.getFilterBy(sr))
        throwMissingIds(sr, ids, invoices.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        return await this.invoiceRepo.delete(ids, sr)
    }

    /**
     * Creates the invoice of the contract and period with the template, the pdf is stored with the invoice
     */
    private async createInvoice(invoice: internal.Invoice, sr: ServiceRequest, key: number): Promise<internal.Invoice> {
        this.checkPeriod(invoice, sr, key)
        const template = await this.readTemplate(invoice, sr, key)
        const contract = await this.readContract(invoice, template, sr, key)
        const billingProfile = await this.customerService.readActualBillingProfile(invoice.contractId, invoice.periodStart)

        const category = template.category
        const role = sr.user.role
        const query: InvoiceCdrQuery = {
            contractId: invoice.contractId,
            contractType: invoiceCdrContractType[category],
            costCategory: invoiceCostCategory[category],
            callDirection: template.callDirection ?? InvoiceTemplateCallDirection.Out,
            start: invoice.periodStart,
            end: invoice.periodEnd,
        }
        const zones = zonesTotal(mergeZones(await this.invoiceRepo.readZones(query), role), category)
        const didZoneVars = category == InvoiceTemplateCategory.Did
            ? didZones(await this.invoiceRepo.readDidZones(query), role, category)
            : undefined
        let calls
        if (category == InvoiceTemplateCategory.Customer) {
            const showSuppressions = isShowCallListSuppressions(role)
            const rows = await this.invoiceRepo.readCalls(query, showSuppressions)
            const suppressionIds = [...new Set(rows.filter(r => r.suppressionId != null).map(r => r.suppressionId))]
            const suppressions = await this.invoiceRepo.readCallListSuppressions(suppressionIds)
            calls = invoiceCalls(rows, new Map(suppressions.map(s => [s.id, s])), showSuppressions)
        }
        const amounts = invoiceAmounts(zones, contract.contract)

        invoice.amountNet = amounts.amountNet
        invoice.amountVat = amounts.amountVat
        invoice.amountTotal = amounts.amountTotal
        // the serial is derived from the id, a unique temporary one is stored first
        invoice.serial = `tmp${Date.now()}${Math.floor(Math.random() * 100000)}`
        invoice.data = null
        invoice.generator = null
        invoice.sentDate = null
        const id = await this.invoiceRepo.create(invoice)

        invoice.serial = invoiceSerial(id, invoice.periodStart)
        const vars = invoiceTemplateVars({
            contract: contract,
            billingProfile: billingProfile,
            serial: invoice.serial,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            amounts: amounts,
            callDirection: query.callDirection,
            zones: zones,
            calls: calls,
            didZones: didZoneVars,
        })
        invoice.data = await this.invoiceTemplateService.render(template, vars)
        await this.invoiceRepo.update(id, invoice)
        return await this.invoiceRepo.readById(id, sr)
    }

    private checkPeriod(invoice: internal.Invoice, sr: ServiceRequest, key: number): void {
        if (!invoice.periodStart)
            throw apiError(this.i18n.t('errors.INVOICE_PERIOD_REQUIRED'), itemPointer(sr, key, invoice, 'periodStart'))
        const start = invoice.periodStart.getTime()
        const end = invoice.periodEnd?.getTime()
        if (Number.isNaN(start) || end === undefined || Number.isNaN(end) || start >= end)
            throw apiError(this.i18n.t('errors.INVOICE_PERIOD_INVALID'), itemPointer(sr, key, invoice, Number.isNaN(start) ? 'periodStart' : 'periodEnd'))
    }

    private async readTemplate(invoice: internal.Invoice, sr: ServiceRequest, key: number): Promise<internal.InvoiceTemplate> {
        const id = invoice.templateId
        try {
            return await this.invoiceTemplateService.read(id, sr)
        } catch (err) {
            if (err instanceof NotFoundException)
                throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_NOT_FOUND', {args: {id: id}}), itemPointer(sr, key, invoice, 'templateId'))
            throw err
        }
    }

    private async readContract(invoice: internal.Invoice, template: internal.InvoiceTemplate, sr: ServiceRequest, key: number): Promise<InvoiceContract> {
        const id = invoice.contractId
        const pointer = itemPointer(sr, key, invoice, 'contractId')
        const classes = invoiceContractClasses[template.category]
        const contract = await this.invoiceRepo.readContract(id)
        if (!contract
            || !classes.includes(contract.productClass)
            || contract.contract.status == ContractStatus.Terminated
            || (sr.user.reseller_id_required && contract.contact.reseller_id != sr.user.reseller_id)
        ) {
            throw apiError(this.i18n.t('errors.INVOICE_CONTRACT_NOT_FOUND', {
                args: {id: id, classes: classes.join('/'), category: template.category},
            }), pointer)
        }
        if (resellerCategories.includes(template.category) && contract.contact.reseller_id != template.resellerId) {
            throw apiError(this.i18n.t('errors.INVOICE_CONTRACT_RESELLER_MISMATCH', {
                args: {id: id},
            }), pointer)
        }
        return contract
    }

    private getFilterBy(sr: ServiceRequest): FilterBy | undefined {
        return sr.user.reseller_id_required ? {resellerId: sr.user.reseller_id} : undefined
    }
}
