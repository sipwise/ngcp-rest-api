jest.mock('./invoice-template.helper', (): object => ({
    ...jest.requireActual('./invoice-template.helper'),
    readDefaultInvoiceTemplate: jest.fn(),
    checkInvoiceTemplateDirectives: jest.fn(),
}))
jest.mock('./invoice-template.legacy', () => ({convertLegacyInvoiceTemplate: jest.fn()}))
jest.mock('./invoice-template.renderer', (): object => ({
    ...jest.requireActual('./invoice-template.renderer'),
    renderInvoiceTemplate: jest.fn(),
    svgToPdf: jest.fn(),
}))

import {
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
    StreamableFile,
    UnprocessableEntityException,
} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'
import {I18nService} from 'nestjs-i18n'

import {checkInvoiceTemplateDirectives, readDefaultInvoiceTemplate} from './invoice-template.helper'
import {convertLegacyInvoiceTemplate} from './invoice-template.legacy'
import {
    InvoiceTemplatePdfError,
    InvoiceTemplateRenderError,
    renderInvoiceTemplate,
    svgToPdf,
} from './invoice-template.renderer'
import {InvoiceTemplateService} from './invoice.service'
import {InvoiceTemplateMariadbRepository} from './repositories/invoice.mariadb.repository'
import {InvoiceTemplateMockRepository} from './repositories/invoice.mock.repository'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
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
const ccareAdminUser: AuthResponseDto = {...admin, id: 4, role: 'ccareadmin'}

const defaultSvg = Buffer.from('<svg>default</svg>')

describe('InvoiceTemplateService', () => {
    let service: InvoiceTemplateService
    let repo: InvoiceTemplateMockRepository

    const makeSr = (user: AuthResponseDto = admin): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params: undefined,
        query: {},
        user,
        req: undefined,
    })

    const newTemplate = (data: Partial<internal.InvoiceTemplate>): internal.InvoiceTemplate =>
        Object.assign(new internal.InvoiceTemplate(), data)

    const file = (content: string): Express.Multer.File => ({buffer: Buffer.from(content)} as Express.Multer.File)

    beforeEach(async () => {
        repo = new InvoiceTemplateMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoiceTemplateService,
                {provide: InvoiceTemplateMariadbRepository, useValue: repo},
                {provide: I18nService, useValue: {t: (key: string) => key}},
            ],
        }).compile()
        service = module.get<InvoiceTemplateService>(InvoiceTemplateService)
        ;(readDefaultInvoiceTemplate as jest.Mock).mockResolvedValue(defaultSvg)
        ;(checkInvoiceTemplateDirectives as jest.Mock).mockReturnValue([])
        ;(convertLegacyInvoiceTemplate as jest.Mock).mockImplementation((c: string) => c)
        ;(renderInvoiceTemplate as jest.Mock).mockReturnValue('<svg>rendered</svg>')
        ;(svgToPdf as jest.Mock).mockResolvedValue(Buffer.from('pdf'))
    })

    afterEach(() => {
        jest.resetAllMocks()
        jest.restoreAllMocks()
    })

    describe('read', () => {
        it('lists all templates for an admin', async () => {
            const [rows, total] = await service.readAll(makeSr())
            expect(total).toBe(3)
            expect(rows).toHaveLength(3)
        })

        it('lists only the templates of the reseller', async () => {
            const [rows, total] = await service.readAll(makeSr(resellerUser))
            expect(total).toBe(1)
            expect(rows[0].name).toBe('cust1')
        })

        it('passes the reseller filter to the repository', async () => {
            const spy = jest.spyOn(repo, 'readById')
            await service.read(1, makeSr(resellerUser))
            expect(spy).toHaveBeenCalledWith(1, expect.anything(), {resellerId: 1})
        })

        it('does not filter for an admin', async () => {
            const spy = jest.spyOn(repo, 'readById')
            await service.read(2, makeSr())
            expect(spy).toHaveBeenCalledWith(2, expect.anything(), undefined)
        })

        it('does not return a template of another reseller', async () => {
            await expect(service.read(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException for an unknown id', async () => {
            await expect(service.read(99, makeSr())).rejects.toThrow(NotFoundException)
        })
    })

    describe('readVars', () => {
        it('returns the variables of the template category', async () => {
            const vars = await service.readVars(1, makeSr())
            expect(vars.customer).toBeDefined()
            expect(vars.calls).toBeDefined()
        })

        it('has no calls for a peer template', async () => {
            const vars = await service.readVars(3, makeSr())
            expect(vars.calls).toBeUndefined()
        })

        it('throws NotFoundException for another reseller', async () => {
            await expect(service.readVars(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })
    })

    describe('create', () => {
        it('returns an empty list for no entities', async () => {
            expect(await service.create([], makeSr())).toEqual([])
        })

        it.each([['ccare', ccareUser], ['ccareadmin', ccareAdminUser]])('throws ForbiddenException for %s', async (_n, user) => {
            await expect(service.create([newTemplate({name: 'x', category: InvoiceTemplateCategory.Peer})], makeSr(user)))
                .rejects.toThrow(ForbiddenException)
        })

        it('uses the default content without a file', async () => {
            const [created] = await service.create([newTemplate({name: 'new', category: InvoiceTemplateCategory.Peer})], makeSr())
            expect(readDefaultInvoiceTemplate).toHaveBeenCalledWith(InvoiceTemplateCategory.Peer)
            expect(created.data).toEqual(defaultSvg)
        })

        it('requires the reseller for customer and did categories', async () => {
            for (const category of [InvoiceTemplateCategory.Customer, InvoiceTemplateCategory.Did]) {
                await expect(service.create([newTemplate({name: 'x', category})], makeSr()))
                    .rejects.toThrow(UnprocessableEntityException)
            }
        })

        it('rejects a reseller for peer and reseller categories as admin', async () => {
            for (const category of [InvoiceTemplateCategory.Peer, InvoiceTemplateCategory.Reseller]) {
                await expect(service.create([newTemplate({name: 'x', category, resellerId: 1})], makeSr()))
                    .rejects.toThrow(UnprocessableEntityException)
            }
        })

        it('creates a customer template for the given reseller as admin', async () => {
            const [created] = await service.create([newTemplate({name: 'x', category: InvoiceTemplateCategory.Customer, resellerId: 2})], makeSr())
            expect(created.resellerId).toBe(2)
        })

        it('forces the reseller of a reseller user', async () => {
            const [created] = await service.create(
                [newTemplate({name: 'x', category: InvoiceTemplateCategory.Customer, resellerId: 2})],
                makeSr(resellerUser),
            )
            expect(created.resellerId).toBe(1)
        })

        it('rejects an existing name of the same reseller', async () => {
            await expect(service.create(
                [newTemplate({name: 'cust1', category: InvoiceTemplateCategory.Customer, resellerId: 1})],
                makeSr(),
            )).rejects.toThrow(UnprocessableEntityException)
        })

        it('allows the same name for another reseller', async () => {
            const [created] = await service.create(
                [newTemplate({name: 'cust1', category: InvoiceTemplateCategory.Customer, resellerId: 2})],
                makeSr(),
            )
            expect(created.resellerId).toBe(2)
        })

        it('rejects a file without svg content', async () => {
            await expect(service.create([newTemplate({name: 'x', category: InvoiceTemplateCategory.Peer})], makeSr(), file('hello')))
                .rejects.toThrow(UnprocessableEntityException)
        })

        it('rejects a file without buffer', async () => {
            await expect(service.create(
                [newTemplate({name: 'x', category: InvoiceTemplateCategory.Peer})],
                makeSr(),
                {} as Express.Multer.File,
            )).rejects.toThrow(UnprocessableEntityException)
        })

        it('removes scripts from the uploaded file', async () => {
            const [created] = await service.create(
                [newTemplate({name: 'x', category: InvoiceTemplateCategory.Peer})],
                makeSr(),
                file('<svg><script>alert(1)</script><text/></svg>'),
            )
            expect(created.data.toString()).toBe('<svg><text/></svg>')
            expect(readDefaultInvoiceTemplate).not.toHaveBeenCalled()
        })

        it('rejects a file with invalid directives and lists them', async () => {
            ;(checkInvoiceTemplateDirectives as jest.Mock).mockReturnValue(['bad one', 'bad two'])
            const err = await (service.create(
                [newTemplate({name: 'x', category: InvoiceTemplateCategory.Peer})],
                makeSr(),
                file('<svg></svg>'),
            ) as Promise<unknown>).catch((e: unknown) => e) as UnprocessableEntityException
            expect(err).toBeInstanceOf(UnprocessableEntityException)
            expect(JSON.stringify(err.getResponse())).toContain('bad one')
            expect(JSON.stringify(err.getResponse())).toContain('bad two')
        })

        it('throws UnprocessableEntityException if the default template cannot be loaded', async () => {
            ;(readDefaultInvoiceTemplate as jest.Mock).mockRejectedValue(new Error('ENOENT'))
            await expect(service.create([newTemplate({name: 'x', category: InvoiceTemplateCategory.Peer})], makeSr()))
                .rejects.toThrow(UnprocessableEntityException)
        })

        it('does not store anything when the check fails', async () => {
            const spy = jest.spyOn(repo, 'create')
            await service.create([newTemplate({name: 'peer', category: InvoiceTemplateCategory.Peer})], makeSr()).catch(() => undefined)
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('readFile', () => {
        it('returns the stored svg as attachment', async () => {
            const result = await service.readFile(1, makeSr())
            expect(result).toBeInstanceOf(StreamableFile)
            expect(result.getHeaders()).toMatchObject({
                type: 'image/svg+xml; charset=utf-8',
                disposition: 'attachment; filename="cust1.svg"',
                length: repo.templateDB[1].data.length,
            })
        })

        it('converts a legacy template', async () => {
            ;(convertLegacyInvoiceTemplate as jest.Mock).mockReturnValue('<svg>converted</svg>')
            const result = await service.readFile(1, makeSr())
            expect(result.getHeaders().length).toBe('<svg>converted</svg>'.length)
        })

        it('falls back to the default content without data', async () => {
            const result = await service.readFile(3, makeSr())
            expect(readDefaultInvoiceTemplate).toHaveBeenCalledWith(InvoiceTemplateCategory.Peer)
            expect(result.getHeaders().length).toBe(defaultSvg.length)
        })

        it('replaces unsafe characters in the filename', async () => {
            repo.templateDB[1].name = 'a"b\\c\nd'
            const result = await service.readFile(1, makeSr())
            expect(result.getHeaders().disposition).toBe('attachment; filename="a_b_c_d.svg"')
        })

        it('throws NotFoundException for another reseller', async () => {
            await expect(service.readFile(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })
    })

    describe('render', () => {
        const template = (): internal.InvoiceTemplate => repo.templateDB[1]

        it('renders the template content to a pdf', async () => {
            const pdf = await service.render(template(), {} as never)
            expect(pdf.toString()).toBe('pdf')
            expect(renderInvoiceTemplate).toHaveBeenCalledWith('<svg>one</svg>', expect.anything(), InvoiceTemplateCategory.Customer)
            expect(svgToPdf).toHaveBeenCalledWith('<svg>rendered</svg>')
        })

        it('maps a render error to UnprocessableEntityException', async () => {
            ;(renderInvoiceTemplate as jest.Mock).mockImplementation(() => {
                throw new InvoiceTemplateRenderError('boom')
            })
            await expect(service.render(template(), {} as never)).rejects.toThrow(UnprocessableEntityException)
        })

        it('maps a pdf error to InternalServerErrorException', async () => {
            ;(svgToPdf as jest.Mock).mockRejectedValue(new InvoiceTemplatePdfError('converter'))
            await expect(service.render(template(), {} as never)).rejects.toThrow(InternalServerErrorException)
        })

        it('rethrows unknown errors', async () => {
            const error = new Error('unknown')
            ;(svgToPdf as jest.Mock).mockRejectedValue(error)
            await expect(service.render(template(), {} as never)).rejects.toBe(error)
        })
    })

    describe('renderPreview', () => {
        it('returns the pdf inline', async () => {
            const result = await service.renderPreview(1, makeSr())
            expect(result.getHeaders()).toMatchObject({type: 'application/pdf', disposition: 'inline; filename="cust1.pdf"', length: 3})
        })

        it('renders with the example variables of the template', async () => {
            repo.templateDB[3].callDirection = InvoiceTemplateCallDirection.In
            await service.renderPreview(3, makeSr())
            expect(renderInvoiceTemplate).toHaveBeenCalledWith(defaultSvg.toString(), expect.anything(), InvoiceTemplateCategory.Peer)
        })

        it('throws NotFoundException for another reseller', async () => {
            await expect(service.renderPreview(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })
    })

    describe('update', () => {
        const upd = (id: number, data: Partial<internal.InvoiceTemplate>): Dictionary<internal.InvoiceTemplate> =>
            ({[id]: newTemplate({category: repo.templateDB[id].category, resellerId: repo.templateDB[id].resellerId, ...data})})

        it('throws ForbiddenException for a read-only role', async () => {
            await expect(service.update(upd(1, {name: 'n'}), makeSr(ccareUser))).rejects.toThrow(ForbiddenException)
        })

        it('throws NotFoundException if no id exists', async () => {
            await expect(service.update({99: newTemplate({name: 'n', category: InvoiceTemplateCategory.Peer})}, makeSr()))
                .rejects.toThrow(NotFoundException)
        })

        it('throws UnprocessableEntityException if only some ids exist', async () => {
            const updates = {
                ...upd(1, {name: 'n1'}),
                99: newTemplate({name: 'n99', category: InvoiceTemplateCategory.Peer}),
            }
            await expect(service.update(updates, makeSr())).rejects.toThrow(UnprocessableEntityException)
        })

        it('does not update a template of another reseller', async () => {
            await expect(service.update(upd(2, {name: 'n'}), makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })

        it('rejects a category change', async () => {
            await expect(service.update(upd(1, {name: 'n', category: InvoiceTemplateCategory.Did}), makeSr()))
                .rejects.toThrow(UnprocessableEntityException)
        })

        it('keeps the stored data without a file', async () => {
            const stored = repo.templateDB[1].data
            const updates = upd(1, {name: 'renamed'})
            await service.update(updates, makeSr())
            expect(updates[1].id).toBe(1)
            expect(repo.templateDB[1].name).toBe('renamed')
            expect(repo.templateDB[1].data).toBe(stored)
        })

        it('allows keeping the own name', async () => {
            expect(await service.update(upd(1, {name: 'cust1'}), makeSr())).toEqual([1])
        })

        it('rejects the name of another template of the reseller', async () => {
            repo.templateDB[2].resellerId = 1
            await expect(service.update(upd(1, {name: 'cust2'}), makeSr())).rejects.toThrow(UnprocessableEntityException)
        })

        it('replaces the data with a file', async () => {
            await service.update(upd(1, {name: 'cust1'}), makeSr(), file('<svg>new</svg>'))
            expect(repo.templateDB[1].data.toString()).toBe('<svg>new</svg>')
        })

        it('resets to the default content on replace without file', async () => {
            await service.update(upd(1, {name: 'cust1'}), makeSr(), undefined, true)
            expect(repo.templateDB[1].data).toEqual(defaultSvg)
        })

        it('rejects an invalid file and keeps the data', async () => {
            const stored = repo.templateDB[1].data
            await expect(service.update(upd(1, {name: 'cust1'}), makeSr(), file('nope'))).rejects.toThrow(UnprocessableEntityException)
            expect(repo.templateDB[1].data).toBe(stored)
        })

        it('forces the reseller of a reseller user', async () => {
            await service.update(upd(1, {name: 'cust1', resellerId: 2}), makeSr(resellerUser))
            expect(repo.templateDB[1].resellerId).toBe(1)
        })

        it('requires the reseller for a customer template as admin', async () => {
            await expect(service.update(upd(1, {name: 'cust1', resellerId: undefined}), makeSr()))
                .rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('delete', () => {
        it('throws ForbiddenException for a read-only role', async () => {
            await expect(service.delete([1], makeSr(ccareAdminUser))).rejects.toThrow(ForbiddenException)
        })

        it('deletes the templates', async () => {
            expect(await service.delete([1, 3], makeSr())).toEqual([1, 3])
            expect(repo.templateDB[1]).toBeUndefined()
        })

        it('throws NotFoundException if no id exists', async () => {
            await expect(service.delete([98, 99], makeSr())).rejects.toThrow(NotFoundException)
        })

        it('throws UnprocessableEntityException for partial ids and deletes nothing', async () => {
            const spy = jest.spyOn(repo, 'delete')
            await expect(service.delete([1, 99], makeSr())).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('does not delete a template of another reseller', async () => {
            await expect(service.delete([2], makeSr(resellerUser))).rejects.toThrow(NotFoundException)
            expect(repo.templateDB[2]).toBeDefined()
        })
    })
})
