import {NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'
import {I18nService} from 'nestjs-i18n'

import {InvoiceCallRow, InvoiceCallSide, InvoiceContract, InvoiceZoneRow} from './interfaces/invoice-data.interface'
import {InvoiceService} from './invoice.service'
import {InvoiceMariadbRepository} from './repositories/invoice.mariadb.repository'
import {InvoiceMockRepository} from './repositories/invoice.mock.repository'

import {CustomerService} from '~/api/customers/customer.service'
import {InvoiceTemplateService} from '~/api/templates/invoices/invoice.service'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {CallListSuppressionMode} from '~/helpers/call-list-suppression.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const admin: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

const resellerUser: AuthResponseDto = {...admin, id: 2, role: 'reseller', reseller_id: 1, reseller_id_required: true}
const ccareUser: AuthResponseDto = {...admin, id: 3, role: 'ccare'}

const periodStart = new Date(2026, 0, 1)
const periodEnd = new Date(2026, 1, 1)

const zoneRow = (data: Partial<InvoiceZoneRow> = {}): InvoiceZoneRow => ({
    zone: 'AT', zoneDetail: '', customerCost: 1000, resellerCost: 500, carrierCost: 300, freeTime: 0, duration: 60, number: 1, ...data,
})

const callRow = (data: Partial<InvoiceCallRow> = {}): InvoiceCallRow => ({
    side: InvoiceCallSide.Source, sourceUser: 'u', sourceDomain: 'd', sourceCli: '1', destinationUserIn: '2', startTime: 100,
    duration: 10, callType: 'call', cost: 1, zone: 'AT', zoneDetail: null, suppressionId: null, ...data,
})

describe('InvoiceService', () => {
    let service: InvoiceService
    let repo: InvoiceMockRepository
    let templateService: {read: jest.Mock, render: jest.Mock}
    let customerService: {readActualBillingProfile: jest.Mock}
    let templates: {[key: number]: internal.InvoiceTemplate}

    const makeSr = (user: AuthResponseDto = admin): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params: undefined,
        query: {},
        user,
        req: undefined,
    })

    const newInvoice = (data: Partial<internal.Invoice> = {}): internal.Invoice => Object.assign(new internal.Invoice(), {
        contractId: 10, templateId: 1, periodStart, periodEnd, ...data,
    })

    const newContract = (id: number, resellerId: number, productClass: ProductClass, data: Partial<internal.Contract> = {}): InvoiceContract => ({
        contract: internal.Contract.create({id, add_vat: true, vat_rate: 20, status: ContractStatus.Active, ...data} as internal.Contract),
        productClass,
        contact: internal.Contact.create({reseller_id: resellerId} as internal.Contact),
        resellerContact: internal.Contact.create({reseller_id: resellerId} as internal.Contact),
    })

    const newTemplate = (id: number, category: InvoiceTemplateCategory, resellerId?: number): internal.InvoiceTemplate =>
        Object.assign(new internal.InvoiceTemplate(), {id, category, resellerId, name: `t${id}`})

    const seedInvoice = (id: number, resellerId: number, data: Partial<internal.Invoice> = {}): void => {
        repo.invoiceDB[id] = Object.assign(new internal.Invoice(), {
            id, contractId: 10, serial: `INV${id}`, periodStart, periodEnd, resellerId, ...data,
        })
    }

    beforeEach(async () => {
        repo = new InvoiceMockRepository()
        repo.contractDB[10] = newContract(10, 1, ProductClass.SipAccount)
        repo.contractDB[11] = newContract(11, 2, ProductClass.SipAccount)
        repo.contractDB[12] = newContract(12, 1, ProductClass.SipAccount, {status: ContractStatus.Terminated})
        repo.contractDB[13] = newContract(13, 1, ProductClass.SipPeering)
        repo.contractDB[14] = newContract(14, 1, ProductClass.Reseller)
        repo.zones = [zoneRow()]
        templates = {
            1: newTemplate(1, InvoiceTemplateCategory.Customer, 1),
            2: newTemplate(2, InvoiceTemplateCategory.Did, 1),
            3: newTemplate(3, InvoiceTemplateCategory.Peer),
            4: newTemplate(4, InvoiceTemplateCategory.Reseller),
            5: newTemplate(5, InvoiceTemplateCategory.Customer, 2),
        }
        templateService = {
            read: jest.fn(async (id: number) => {
                if (!templates[id])
                    throw new NotFoundException()
                return templates[id]
            }),
            render: jest.fn(async () => Buffer.from('pdf')),
        }
        customerService = {readActualBillingProfile: jest.fn(async () => Object.assign(new internal.BillingProfile(), {id: 1, handle: 'h', name: 'n'}))}
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoiceService,
                {provide: InvoiceMariadbRepository, useValue: repo},
                {provide: I18nService, useValue: {t: (key: string) => key}},
                {provide: InvoiceTemplateService, useValue: templateService},
                {provide: CustomerService, useValue: customerService},
            ],
        }).compile()
        service = module.get<InvoiceService>(InvoiceService)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('create', () => {
        it('returns an empty list for no invoices', async () => {
            expect(await service.create([], makeSr())).toEqual([])
        })

        it('creates the invoice with amounts, serial and pdf', async () => {
            const [created] = await service.create([newInvoice()], makeSr())
            expect(created.id).toBe(1)
            expect(created.serial).toBe('INV2026010000001')
            expect(created.amountNet).toBe(1000)
            expect(created.amountVat).toBe(200)
            expect(created.amountTotal).toBe(1200)
            expect(created.data.toString()).toBe('pdf')
            expect(repo.invoiceDB[1].serial).toBe('INV2026010000001')
        })

        it('stores a temporary serial first and resets the data fields', async () => {
            const stored: internal.Invoice[] = []
            const original = repo.create.bind(repo)
            jest.spyOn(repo, 'create').mockImplementation(async (i) => {
                stored.push({...i})
                return await original(i) as number
            })
            await service.create([newInvoice({sentDate: new Date(), data: Buffer.from('x')})], makeSr())
            expect(stored[0].serial).toMatch(/^tmp/)
            expect(stored[0].data).toBeNull()
            expect(stored[0].sentDate).toBeNull()
            expect(stored[0].generator).toBeNull()
        })

        it('creates every invoice of the list', async () => {
            const created = await service.create([newInvoice(), newInvoice({contractId: 10})], makeSr())
            expect(created.map(i => i.id)).toEqual([1, 2])
            expect(created[1].serial).toBe('INV2026010000002')
        })

        it('stops at the first failing invoice', async () => {
            await expect(service.create([newInvoice(), newInvoice({contractId: 99})], makeSr())).rejects.toThrow(ApiErrorException)
            expect(Object.keys(repo.invoiceDB)).toEqual(['1'])
        })

        it('adds no vat if the contract has none', async () => {
            repo.contractDB[10].contract.add_vat = false
            const [created] = await service.create([newInvoice()], makeSr())
            expect(created.amountVat).toBe(0)
            expect(created.amountTotal).toBe(1000)
        })

        it('uses the billing profile at the period start', async () => {
            await service.create([newInvoice()], makeSr())
            expect(customerService.readActualBillingProfile).toHaveBeenCalledWith(10, periodStart)
        })

        it('renders the template with the invoice variables', async () => {
            await service.create([newInvoice()], makeSr())
            const [template, vars] = templateService.render.mock.calls[0]
            expect(template).toBe(templates[1])
            expect(vars.invoice.serial).toBe('INV2026010000001')
            expect(vars.invoice.amount_total).toBe(1200)
            expect(vars.calls).toBeDefined()
            expect(vars.did_zones).toBeUndefined()
        })

        it('defaults the call direction to out', async () => {
            const spy = jest.spyOn(repo, 'readZones')
            await service.create([newInvoice()], makeSr())
            expect(spy.mock.calls[0][0]).toMatchObject({callDirection: InvoiceTemplateCallDirection.Out, contractType: 'account', costCategory: 'customer'})
        })

        it('uses the call direction of the template', async () => {
            templates[1].callDirection = InvoiceTemplateCallDirection.InOut
            const spy = jest.spyOn(repo, 'readZones')
            await service.create([newInvoice()], makeSr())
            expect(spy.mock.calls[0][0].callDirection).toBe(InvoiceTemplateCallDirection.InOut)
        })

        it('includes the call list only for customer templates', async () => {
            const spy = jest.spyOn(repo, 'readCalls')
            await service.create([newInvoice({contractId: 13, templateId: 3})], makeSr())
            expect(spy).not.toHaveBeenCalled()
            expect(templateService.render.mock.calls[0][1].calls).toBeUndefined()
        })

        it('reads the did zones only for did templates', async () => {
            const spy = jest.spyOn(repo, 'readDidZones')
            await service.create([newInvoice()], makeSr())
            expect(spy).not.toHaveBeenCalled()
            repo.didZoneRows = [{...zoneRow(), subscriberId: 7}]
            await service.create([newInvoice({templateId: 2})], makeSr())
            expect(spy).toHaveBeenCalledTimes(1)
            expect(templateService.render.mock.calls[1][1].did_zones).toHaveLength(1)
            expect(templateService.render.mock.calls[1][1].calls).toBeUndefined()
        })

        it('uses carrier cost and provider contracts for peer templates', async () => {
            const spy = jest.spyOn(repo, 'readZones')
            const [created] = await service.create([newInvoice({contractId: 13, templateId: 3})], makeSr())
            expect(spy.mock.calls[0][0]).toMatchObject({contractType: 'provider', costCategory: 'carrier'})
            expect(created.amountNet).toBe(300)
        })

        it('uses reseller cost for reseller templates', async () => {
            const [created] = await service.create([newInvoice({contractId: 14, templateId: 4})], makeSr())
            expect(created.amountNet).toBe(500)
        })

        it('reads each suppression once and shows them to admins', async () => {
            repo.calls = [callRow({suppressionId: 5}), callRow({suppressionId: 5, startTime: 50}), callRow()]
            repo.suppressions = [{id: 5, label: 'sup', mode: CallListSuppressionMode.Obfuscate}]
            const callSpy = jest.spyOn(repo, 'readCalls')
            const supSpy = jest.spyOn(repo, 'readCallListSuppressions')
            await service.create([newInvoice()], makeSr())
            expect(callSpy.mock.calls[0][1]).toBe(true)
            expect(supSpy).toHaveBeenCalledWith([5])
            expect(templateService.render.mock.calls[0][1].calls).toHaveLength(3)
        })

        it('hides suppressions from roles without access', async () => {
            const callSpy = jest.spyOn(repo, 'readCalls')
            await service.create([newInvoice()], makeSr(ccareUser))
            expect(callSpy.mock.calls[0][1]).toBe(false)
        })

        it('removes the carrier cost of a reseller user from the zones', async () => {
            await service.create([newInvoice()], makeSr(resellerUser))
            const zone = templateService.render.mock.calls[0][1].zones.data[0]
            expect(zone.carriercost).toBeUndefined()
            expect(zone.resellercost).toBe(500)
        })

        it('does not create an invoice if the rendering fails', async () => {
            templateService.render.mockRejectedValue(new UnprocessableEntityException())
            await expect(service.create([newInvoice()], makeSr())).rejects.toThrow(UnprocessableEntityException)
            expect(Object.keys(repo.invoiceDB)).toEqual(['1'])
            expect(repo.invoiceDB[1].serial).toMatch(/^tmp/)
        })

        describe('period', () => {
            it.each([
                ['missing start', {periodStart: undefined}],
                ['missing end', {periodEnd: undefined}],
                ['invalid start', {periodStart: new Date('x')}],
                ['invalid end', {periodEnd: new Date('x')}],
                ['start after end', {periodStart: periodEnd, periodEnd: periodStart}],
                ['start equals end', {periodEnd: periodStart}],
            ])('rejects %s', async (_n, data) => {
                const spy = jest.spyOn(repo, 'create')
                await expect(service.create([newInvoice(data)], makeSr())).rejects.toThrow(ApiErrorException)
                expect(spy).not.toHaveBeenCalled()
            })
        })

        describe('template', () => {
            it('maps an unknown template to UnprocessableEntityException', async () => {
                await expect(service.create([newInvoice({templateId: 99})], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('maps a template of another reseller to UnprocessableEntityException for a reseller user', async () => {
                templateService.read.mockRejectedValue(new NotFoundException())
                await expect(service.create([newInvoice()], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            })

            it('rethrows other errors of the template lookup', async () => {
                const error = new Error('db down')
                templateService.read.mockRejectedValue(error)
                await expect(service.create([newInvoice()], makeSr())).rejects.toBe(error)
            })
        })

        describe('contract', () => {
            it('rejects an unknown contract', async () => {
                await expect(service.create([newInvoice({contractId: 99})], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('rejects a terminated contract', async () => {
                await expect(service.create([newInvoice({contractId: 12})], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('rejects a contract of the wrong product class', async () => {
                await expect(service.create([newInvoice({contractId: 13})], makeSr())).rejects.toThrow(ApiErrorException)
                await expect(service.create([newInvoice({contractId: 10, templateId: 3})], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('rejects the contract of another reseller for a reseller user', async () => {
                await expect(service.create([newInvoice({contractId: 11, templateId: 5})], makeSr(resellerUser)))
                    .rejects.toThrow(ApiErrorException)
            })

            it('accepts the contract of another reseller for an admin if the template matches', async () => {
                const [created] = await service.create([newInvoice({contractId: 11, templateId: 5})], makeSr())
                expect(created.id).toBe(1)
            })

            it.each([[1], [2]])('rejects a reseller mismatch of the template %i and contract', async (templateId) => {
                await expect(service.create([newInvoice({contractId: 11, templateId})], makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })

            it('does not check the template reseller for peer and reseller templates', async () => {
                repo.contractDB[13].contact.reseller_id = 2
                const [created] = await service.create([newInvoice({contractId: 13, templateId: 3})], makeSr())
                expect(created.id).toBe(1)
            })

            it('creates nothing for a rejected contract', async () => {
                const spy = jest.spyOn(repo, 'create')
                await service.create([newInvoice({contractId: 12})], makeSr()).catch(() => undefined)
                expect(spy).not.toHaveBeenCalled()
            })
        })
    })

    describe('read', () => {
        beforeEach(() => {
            seedInvoice(1, 1)
            seedInvoice(2, 2)
        })

        it('lists all invoices for an admin', async () => {
            const [rows, total] = await service.readAll(makeSr())
            expect(total).toBe(2)
            expect(rows).toHaveLength(2)
        })

        it('lists only the invoices of the reseller', async () => {
            const [rows, total] = await service.readAll(makeSr(resellerUser))
            expect(total).toBe(1)
            expect(rows[0].id).toBe(1)
        })

        it('passes the filter to the repository', async () => {
            const spy = jest.spyOn(repo, 'readById')
            await service.read(1, makeSr(resellerUser))
            expect(spy).toHaveBeenCalledWith(1, expect.anything(), {resellerId: 1})
            await service.read(2, makeSr())
            expect(spy).toHaveBeenLastCalledWith(2, expect.anything(), undefined)
        })

        it('does not return an invoice of another reseller', async () => {
            await expect(service.read(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException for an unknown id', async () => {
            await expect(service.read(99, makeSr())).rejects.toThrow(NotFoundException)
        })
    })

    describe('readFile', () => {
        it('returns the pdf as attachment', async () => {
            seedInvoice(1, 1, {data: Buffer.from('pdf-data')})
            const result = await service.readFile(1, makeSr())
            expect(result).toBeInstanceOf(StreamableFile)
            expect(result.getHeaders()).toMatchObject({
                type: 'application/pdf',
                disposition: 'attachment; filename="invoice_INV1.pdf"',
                length: 8,
            })
        })

        it('replaces unsafe characters in the filename', async () => {
            seedInvoice(1, 1, {data: Buffer.from('x'), serial: 'a"b\\c\r\nd'})
            const result = await service.readFile(1, makeSr())
            expect(result.getHeaders().disposition).toBe('attachment; filename="invoice_a_b_c__d.pdf"')
        })

        it.each([[undefined], [Buffer.alloc(0)]])('throws NotFoundException without data', async (data) => {
            seedInvoice(1, 1, {data})
            await expect(service.readFile(1, makeSr())).rejects.toThrow(NotFoundException)
        })

        it('does not return the pdf of another reseller', async () => {
            seedInvoice(2, 2, {data: Buffer.from('x')})
            await expect(service.readFile(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })
    })

    describe('delete', () => {
        beforeEach(() => {
            seedInvoice(1, 1)
            seedInvoice(2, 1)
            seedInvoice(3, 2)
        })

        it('deletes the invoices', async () => {
            expect(await service.delete([1, 2], makeSr())).toEqual([1, 2])
            expect(repo.invoiceDB[1]).toBeUndefined()
        })

        it('throws NotFoundException if no id exists', async () => {
            await expect(service.delete([98, 99], makeSr())).rejects.toThrow(ApiErrorException)
        })

        it('throws UnprocessableEntityException for partial ids and deletes nothing', async () => {
            const spy = jest.spyOn(repo, 'delete')
            await expect(service.delete([1, 99], makeSr())).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('does not delete the invoice of another reseller', async () => {
            await expect(service.delete([3], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            await expect(service.delete([1, 3], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            expect(repo.invoiceDB[3]).toBeDefined()
        })
    })
})
