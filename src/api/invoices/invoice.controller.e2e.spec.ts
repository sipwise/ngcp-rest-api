import {ClassSerializerInterceptor, HttpStatus, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'


import {InvoiceResponseDto} from './dto/invoice-response.dto'
import {InvoiceCdrContractType, InvoiceCostCategory} from './interfaces/invoice-data.interface'
import {InvoiceModule} from './invoice.module'
import {InvoiceMariadbRepository} from './repositories/invoice.mariadb.repository'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {InvoiceGenerator} from '~/entities/internal/invoice.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {ErrorEntry} from '~/helpers/errors.helper'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'
import {LicenseMockRepository} from '~/repositories/license.mock.repository'
import {LicenseRepository} from '~/repositories/license.repository'

const RESELLER_ID = 1
const RESELLER_CONTRACT_ID = 1
const SIPPEERING_PRODUCT_ID = 2
const RESELLER_PRODUCT_ID = 3
const SIPACCOUNT_PRODUCT_ID = 4
const SYSTEM_CONTACT_ID = 2
// fixture contracts exist before the invoice period
const CREATED_AT = new Date(2024, 11, 1)
const epoch = (date: Date): number => date.getTime() / 1000

// buffer the binary pdf response body
const bufferParser = (res: request.Response, cb: (err: Error, body: Buffer) => void): void => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
    })
    res.on('end', () => {
        cb(null, Buffer.concat(chunks))
    })
}

describe('Invoice', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const licenseMockRepo = new LicenseMockRepository()
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const resellerCreds = {username: `inv_reseller_${Date.now()}`, password: 'FFFooobarbaz123!!!'}
    const ccareCreds = {username: `inv_ccare_${Date.now()}`, password: 'FFFooobarbaz123!!!'}
    const prefix = `e2e-inv-${Date.now()}`
    const createdAdminIds: number[] = []
    const createdContactIds: number[] = []
    const createdContractIds: number[] = []
    const createdInvoiceIds: number[] = []
    let otherResellerId: number
    let otherResellerContractId: number
    let customerId: number
    let otherCustomerId: number
    // fixtures of the invoices created via POST
    const createdTemplateIds: number[] = []
    const createdZoneIds: number[] = []
    const createdSubscriberIds: number[] = []
    let domainId: number
    let profileId: number
    let cdrCustomerId: number
    let peerId: number
    let terminatedId: number
    const templates: Record<string, number> = {}
    // invoices: a1, a2, a3 of the reseller's customer, b1 of the other reseller's customer
    const invoices: Record<string, {id: number, serial: string, data: Buffer}> = {}

    const createContract = async (
        resellerId: number,
        productId: number,
        contactId?: number,
        values: Partial<db.billing.Contract> = {},
    ): Promise<number> => {
        if (!contactId) {
            const contact = await db.billing.Contact.create({
                reseller_id: resellerId,
                email: `${prefix}-${resellerId}@example.org`,
                create_timestamp: new Date(),
            }).save()
            createdContactIds.push(contact.id)
            contactId = contact.id
        }
        const contract = await db.billing.Contract.create({
            contact_id: contactId,
            product_id: productId,
            status: ContractStatus.Active,
            create_timestamp: CREATED_AT,
            modify_timestamp: CREATED_AT,
            ...values,
        }).save()
        createdContractIds.push(contract.id)
        return contract.id
    }

    const createBilledContract = async (...args: Parameters<typeof createContract>): Promise<number> => {
        const contractId = await createContract(...args)
        await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [contractId, null, `,,${profileId},,;`])
        return contractId
    }

    const createZone = async (zone: string, detail: string): Promise<number> => {
        const result: {insertId: number} = await appService.db.query(
            'INSERT INTO billing.billing_zones_history (billing_profile_id, zone, detail) VALUES (?, ?, ?)', [profileId, zone, detail],
        )
        createdZoneIds.push(result.insertId)
        return result.insertId
    }

    const createSubscriber = async (contractId: number, username: string): Promise<string> => {
        const uuid = crypto.randomUUID()
        const result = await db.billing.VoipSubscriber.insert({
            contract_id: contractId,
            uuid: uuid,
            username: username,
            domain_id: domainId,
        })
        createdSubscriberIds.push((result.identifiers[0] as {id: number}).id)
        return uuid
    }

    let cdrCount = 0
    const createCdr = async (start: Date, values: Record<string, unknown>): Promise<void> => {
        const row: Record<string, unknown> = {
            source_user_id: '0', source_provider_id: '0', source_user: 'src', source_domain: 'example.org',
            source_cli: '431000', source_ip: '127.0.0.1', destination_user_id: '0', destination_provider_id: '0',
            destination_user: 'dst', destination_domain: 'example.org', destination_user_dialed: '432000',
            destination_user_in: '432000', destination_domain_in: 'example.org', call_code: '200',
            init_time: epoch(start), start_time: epoch(start), duration: 60, call_id: `${prefix}-cdr-${++cdrCount}`,
            ...values,
        }
        const columns = Object.keys(row)
        await appService.db.query(
            `INSERT INTO accounting.cdr (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            columns.map(c => row[c]),
        )
    }

    const createTemplate = async (
        name: string,
        category: InvoiceTemplateCategory,
        callDirection: InvoiceTemplateCallDirection,
        resellerId?: number,
    ): Promise<void> => {
        const response = await request(app.getHttpServer())
            .post('/api/templates/invoices')
            .auth(creds.username, creds.password)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({name: `${prefix}-${name}`, category: category, call_direction: callDirection, reseller_id: resellerId})
        expect(response.status).toEqual(HttpStatus.CREATED)
        templates[name] = +response.body.data[0].id
        createdTemplateIds.push(templates[name])
    }

    const post = (body: Record<string, unknown>, user = creds): request.Test =>
        request(app.getHttpServer())
            .post('/api/invoices')
            .auth(user.username, user.password)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(body)

    const createPostFixtures = async (): Promise<void> => {
        const profile = await db.billing.BillingProfile.create({
            reseller_id: RESELLER_ID,
            handle: `${prefix}-profile`,
            name: `${prefix}-profile`.substring(0, 31),
            interval_charge: 2990,
            currency: 'EUR',
        }).save()
        profileId = profile.id
        const domain = await db.billing.Domain.create({domain: `${prefix}.example.org`, reseller_id: RESELLER_ID}).save()
        domainId = domain.id

        cdrCustomerId = await createBilledContract(RESELLER_ID, SIPACCOUNT_PRODUCT_ID, undefined, {add_vat: true, vat_rate: 20})
        peerId = await createBilledContract(undefined, SIPPEERING_PRODUCT_ID, SYSTEM_CONTACT_ID)
        terminatedId = await createBilledContract(RESELLER_ID, SIPACCOUNT_PRODUCT_ID, undefined, {status: ContractStatus.Terminated})
        await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [otherResellerContractId, null, `,,${profileId},,;`])
        const u1 = await createSubscriber(cdrCustomerId, `${prefix}-u1`)
        const u2 = await createSubscriber(cdrCustomerId, `${prefix}-u2`)

        const z1 = await createZone('Z1', 'D1')
        const z2 = await createZone('Z2', 'D2')
        const day = (d: number, h = 10): Date => new Date(2025, 0, d, h, 0, 0)
        const customer = cdrCustomerId
        const out = (uuid: string): Record<string, unknown> => ({
            source_user_id: uuid, source_account_id: customer, source_provider_id: String(RESELLER_CONTRACT_ID),
            destination_provider_id: String(peerId),
        })
        // outgoing calls of the customer, the first one terminates at the peer
        await createCdr(day(10), {
            ...out(u1), destination_user_in: '%2343123', source_customer_cost: 100.5, source_customer_billing_zone_id: z1,
            source_reseller_cost: 50, source_reseller_billing_zone_id: z1, destination_carrier_cost: 30, destination_carrier_billing_zone_id: z2,
        })
        await createCdr(day(20), {...out(u2), duration: 120, source_customer_cost: 200, source_customer_billing_zone_id: z2})
        await createCdr(new Date(2025, 0, 1), {...out(u2), source_customer_cost: 1, source_customer_billing_zone_id: z1})
        // unrated: counted without cost and zone
        await createCdr(day(25), {...out(u1)})
        // not in the period, not ok
        await createCdr(new Date(2025, 1, 1), {...out(u1), source_customer_cost: 1000, source_customer_billing_zone_id: z1})
        await createCdr(day(5), {...out(u1), call_status: 'busy', source_customer_cost: 500, source_customer_billing_zone_id: z1})
        // incoming call from the peer
        await createCdr(day(15), {
            destination_user_id: u1, destination_account_id: customer, source_provider_id: String(peerId),
            destination_provider_id: String(RESELLER_CONTRACT_ID), duration: 30, source_cli: '4312345',
            destination_customer_cost: 10, destination_customer_billing_zone_id: z1,
        })
        // within the contract
        await createCdr(day(16), {
            ...out(u1), destination_user_id: u2, destination_account_id: customer, destination_provider_id: String(RESELLER_CONTRACT_ID),
            source_customer_cost: 999, source_customer_billing_zone_id: z1, destination_customer_cost: 999, destination_customer_billing_zone_id: z1,
        })
        // call of the other reseller to the peer
        await createCdr(day(12), {
            source_provider_id: String(otherResellerContractId), destination_provider_id: String(peerId),
            source_reseller_cost: 77, source_reseller_billing_zone_id: z1,
        })

        await createTemplate('customer', InvoiceTemplateCategory.Customer, InvoiceTemplateCallDirection.InOut, RESELLER_ID)
        await createTemplate('did', InvoiceTemplateCategory.Did, InvoiceTemplateCallDirection.Out, RESELLER_ID)
        await createTemplate('peer', InvoiceTemplateCategory.Peer, InvoiceTemplateCallDirection.In)
        await createTemplate('reseller', InvoiceTemplateCategory.Reseller, InvoiceTemplateCallDirection.Out)
        await createTemplate('other', InvoiceTemplateCategory.Customer, InvoiceTemplateCallDirection.Out, otherResellerId)
        const broken = await db.billing.InvoiceTemplate.create({
            name: `${prefix}-broken`,
            reseller_id: RESELLER_ID,
            type: InvoiceTemplateType.SVG,
            category: InvoiceTemplateCategory.Customer,
            call_direction: InvoiceTemplateCallDirection.Out,
            data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><!--@unknown--></svg>'),
        }).save()
        templates.broken = broken.id
        createdTemplateIds.push(broken.id)
    }

    const createInvoice = async (
        name: string,
        contractId: number,
        periodStart: Date,
        periodEnd: Date,
        generator?: InvoiceGenerator,
    ): Promise<void> => {
        const serial = `${prefix}-${name}`
        const data = Buffer.from(`%PDF-1.4 ${serial}`)
        const invoice = await db.billing.Invoice.create({
            contract_id: contractId,
            serial: serial,
            period_start: periodStart,
            period_end: periodEnd,
            amount_net: 1000,
            amount_vat: 200,
            amount_total: 1200,
            data: data,
            generator: generator,
        }).save()
        createdInvoiceIds.push(invoice.id)
        invoices[name] = {id: invoice.id, serial: serial, data: data}
    }

    const createAdmin = async (login: string, password: string, role: RbacRole): Promise<void> => {
        const response = await request(app.getHttpServer())
            .post('/api/admins')
            .auth(creds.username, creds.password)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
                billing_data: true,
                call_data: false,
                can_reset_password: true,
                is_active: true,
                is_master: true,
                email: `${login}@example.com`,
                login: login,
                password: password,
                read_only: false,
                reseller_id: RESELLER_ID,
                role: role,
                show_passwords: true,
                enable_2fa: false,
            })
        expect(response.status).toEqual(HttpStatus.CREATED)
        createdAdminIds.push(+response.body.data[0].id)
    }

    const get = (url: string, user = creds, accept = 'application/json'): request.Test =>
        request(app.getHttpServer())
            .get(url)
            .auth(user.username, user.password)
            .set('Accept', accept)

    const getPdf = (id: number, user = creds): request.Test =>
        get(`/api/invoices/${id}`, user, 'application/pdf')
            .buffer(true)
            .parse(bufferParser)

    const ids = (response: request.Response): number[] =>
        (response.body.data as InvoiceResponseDto[]).map(i => i.id).sort((a, b) => a - b)

    const idsOf = (...names: string[]): number[] => names.map(name => invoices[name].id).sort((a, b) => a - b)

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [InvoiceModule, AppModule],
        })
            .overrideProvider(LicenseRepository).useValue(licenseMockRepo)
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        app.setGlobalPrefix('api')
        app.useGlobalPipes(new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: true,
        }))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(
            new TransformInterceptor({
                pageName: AppService.config.common.api_default_query_page_name,
                perPageName: AppService.config.common.api_default_query_rows_name,
            }),
            new LoggingInterceptor(),
            new ClassSerializerInterceptor(app.get(Reflector)),
            new TransactionInterceptor(app.get(Reflector)),
            new ResponseValidationInterceptor(),
        )
        app.use(bodyParser.json({
            type: ['application/json-patch+json', 'application/json'],
        }))
        app.getHttpAdapter().getInstance().disable('x-powered-by')
        app.getHttpAdapter().getInstance().set('json spaces', 2)

        await app.init()

        await db.billing.Admin.delete({login: creds.username})
        const adminRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.admin})
        await db.billing.Admin.insert({
            reseller_id: 1,
            login: creds.username,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: adminRole.id,
            is_master: true,
            is_superuser: true,
            is_system: false,
            is_ccare: false,
            lawful_intercept: false,
            is_active: true,
            read_only: false,
            show_passwords: true,
            call_data: true,
            billing_data: true,
            can_reset_password: true,
            enable_2fa: false,
            show_otp_registration_info: false,
        })

        otherResellerContractId = await createContract(undefined, RESELLER_PRODUCT_ID, SYSTEM_CONTACT_ID)
        const reseller = await db.billing.Reseller.create({
            contract_id: otherResellerContractId,
            name: prefix,
            status: ResellerStatus.Active,
        }).save()
        otherResellerId = reseller.id

        customerId = await createContract(RESELLER_ID, SIPACCOUNT_PRODUCT_ID)
        otherCustomerId = await createContract(otherResellerId, SIPACCOUNT_PRODUCT_ID)

        await createInvoice('a1', customerId, new Date(2025, 0, 1), new Date(2025, 0, 31, 23, 59, 59))
        await createInvoice('a2', customerId, new Date(2025, 1, 1), new Date(2025, 1, 28, 23, 59, 59), InvoiceGenerator.Auto)
        await createInvoice('a3', customerId, new Date(2025, 2, 1), new Date(2025, 2, 31, 23, 59, 59))
        await createInvoice('b1', otherCustomerId, new Date(2025, 0, 1), new Date(2025, 0, 31, 23, 59, 59), InvoiceGenerator.Web)
    })

    afterEach(async () => {
        licenseMockRepo.reset()
    })

    afterAll(async () => {
        if (appService.db.isInitialized)
            await appService.db.destroy()
        await app.close()
    })

    it('should be defined', () => {
        expect(app).toBeDefined()
    })

    it('db connection', () => {
        expect(appService.isDbInitialised).toBe(true)
        expect(appService.isDbAvailable).toBe(true)
    })

    it('mock authService.compareBcryptPassword', async () => {
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
        expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
    })

    describe('', () => { // main tests block
        describe('GET', () => {
            it('does not read invoices if the invoice license is inactive', async () => {
                licenseMockRepo.setLicense(LicenseType.invoice, 0)
                const response = await get('/api/invoices')
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
            })
            it('reads invoices without the pdf', async () => {
                const response = await get(`/api/invoices?serial=${prefix}*`)
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: list, total_count: count} = response.body
                expect(count).toEqual(4)
                expect(ids(response)).toEqual(idsOf('a1', 'a2', 'a3', 'b1'))
                expect(Object.keys(list[0]).filter(k => k != 'resourceUrl').sort()).toEqual([
                    'amount_net', 'amount_total', 'amount_vat', 'customer_id', 'generator', 'id',
                    'period_end', 'period_start', 'sent_date', 'serial',
                ])
            })
            it('reads an invoice as json by default', async () => {
                const response = await get(`/api/invoices/${invoices.a2.id}`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.headers['content-type']).toMatch(/application\/json/)
                const invoice: InvoiceResponseDto = response.body
                expect(response.body.data).toBeUndefined()
                expect(invoice.customer_id).toEqual(customerId)
                expect(invoice.serial).toEqual(invoices.a2.serial)
                expect(new Date(invoice.period_start)).toEqual(new Date(2025, 1, 1))
                expect(new Date(invoice.period_end)).toEqual(new Date(2025, 1, 28, 23, 59, 59))
                expect(invoice.amount_net).toEqual(1000)
                expect(invoice.amount_vat).toEqual(200)
                expect(invoice.amount_total).toEqual(1200)
                expect(invoice.sent_date).toBeNull()
                expect(invoice.generator).toEqual(InvoiceGenerator.Auto)
            })
            it('reads the pdf of an invoice', async () => {
                const response = await getPdf(invoices.a1.id)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.headers['content-type']).toMatch(/^application\/pdf/)
                expect(response.headers['content-disposition']).toEqual(`attachment; filename="invoice_${invoices.a1.serial}.pdf"`)
                expect(response.body).toEqual(invoices.a1.data)
            })
            it('does not read a non-existing invoice', async () => {
                expect((await get('/api/invoices/999911111')).status).toEqual(HttpStatus.NOT_FOUND)
                expect((await getPdf(999911111)).status).toEqual(HttpStatus.NOT_FOUND)
            })
        })

        describe('search', () => {
            it.each([
                ['customer_id', (): string => `customer_id=${otherCustomerId}`, ['b1']],
                ['reseller_id', (): string => `reseller_id=${RESELLER_ID}`, ['a1', 'a2', 'a3']],
                ['serial', (): string => `serial=${prefix}-a*`, ['a1', 'a2', 'a3']],
                ['id', (): string => `id=${invoices.a3.id}`, ['a3']],
                ['generator', (): string => `generator=${InvoiceGenerator.Web}`, ['b1']],
                ['period_start_ge', (): string => 'period_start_ge=2025-02-01 00:00:00', ['a2', 'a3']],
                ['period_end_le', (): string => 'period_end_le=2025-01-31 23:59:59', ['a1', 'b1']],
                ['period range', (): string => 'period_start_ge=2025-02-01&period_end_le=2025-02-28 23:59:59', ['a2']],
            ])('filters by %s', async (_name, query, want) => {
                const q = query()
                const response = await get(q.startsWith('serial=') ? `/api/invoices?${q}` : `/api/invoices?serial=${prefix}*&${q}`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual(idsOf(...want))
            })
            it('filters with paging and ordering', async () => {
                const response = await get(`/api/invoices?customer_id=${customerId}&order_by=serial&order_by_direction=desc&rows=2&page=1`)
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: list, total_count: count} = response.body
                expect(count).toEqual(3)
                expect(list.map((i: InvoiceResponseDto) => i.id)).toEqual([invoices.a3.id, invoices.a2.id])
                const page2 = await get(`/api/invoices?customer_id=${customerId}&order_by=serial&order_by_direction=desc&rows=2&page=2`)
                expect(page2.body.data.map((i: InvoiceResponseDto) => i.id)).toEqual([invoices.a1.id])
            })
            it('rejects unknown query parameters', async () => {
                const response = await get('/api/invoices?unknown=1')
                expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
            })
        })

        describe('PUT, PATCH', () => {
            it('does not update invoices', async () => {
                const put = await request(app.getHttpServer())
                    .put(`/api/invoices/${invoices.a1.id}`)
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .set('Content-Type', 'application/json')
                    .send({serial: 'x'})
                expect(put.status).toEqual(HttpStatus.NOT_FOUND)
                const patch = await request(app.getHttpServer())
                    .patch(`/api/invoices/${invoices.a1.id}`)
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/serial', value: 'x'}])
                expect(patch.status).toEqual(HttpStatus.NOT_FOUND)
            })
        })

        describe('as reseller', () => {
            it('create reseller admin', async () => {
                await createAdmin(resellerCreds.username, resellerCreds.password, RbacRole.reseller)
            })
            it('reads only invoices of its own customers', async () => {
                const response = await get(`/api/invoices?serial=${prefix}*`, resellerCreds)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual(idsOf('a1', 'a2', 'a3'))
                const filtered = await get(`/api/invoices?serial=${prefix}*&reseller_id=${otherResellerId}`, resellerCreds)
                expect(filtered.body.total_count).toEqual(0)
            })
            it('reads an invoice of its own customer', async () => {
                expect((await get(`/api/invoices/${invoices.a1.id}`, resellerCreds)).status).toEqual(HttpStatus.OK)
                expect((await getPdf(invoices.a1.id, resellerCreds)).status).toEqual(HttpStatus.OK)
            })
            it('does not read an invoice of another reseller', async () => {
                expect((await get(`/api/invoices/${invoices.b1.id}`, resellerCreds)).status).toEqual(HttpStatus.NOT_FOUND)
                expect((await getPdf(invoices.b1.id, resellerCreds)).status).toEqual(HttpStatus.NOT_FOUND)
            })
            it('does not delete an invoice of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .delete(`/api/invoices/${invoices.b1.id}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })
            it('does not bulk delete invoices of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .delete('/api/invoices')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send([invoices.a3.id, invoices.b1.id])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(await db.billing.Invoice.countBy({contract_id: customerId})).toEqual(3)
                expect(await db.billing.Invoice.countBy({contract_id: otherCustomerId})).toEqual(1)
            })
            it('deletes an invoice of its own customer', async () => {
                const response = await request(app.getHttpServer())
                    .delete(`/api/invoices/${invoices.a3.id}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toEqual([invoices.a3.id])
                expect((await get(`/api/invoices/${invoices.a3.id}`)).status).toEqual(HttpStatus.NOT_FOUND)
            })
        })

        describe('other roles', () => {
            it('create ccareadmin admin', async () => {
                await createAdmin(ccareCreds.username, ccareCreds.password, RbacRole.ccareadmin)
            })
            it('rejects other roles', async () => {
                expect((await get('/api/invoices', ccareCreds)).status).toEqual(HttpStatus.FORBIDDEN)
                expect((await get(`/api/invoices/${invoices.a1.id}`, ccareCreds)).status).toEqual(HttpStatus.FORBIDDEN)
                const response = await request(app.getHttpServer())
                    .delete(`/api/invoices/${invoices.a1.id}`)
                    .auth(ccareCreds.username, ccareCreds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
            })
        })

        describe('POST', () => {
            const created: Record<string, InvoiceResponseDto> = {}
            const expectPdf = async (id: number): Promise<void> => {
                const response = await getPdf(id)
                expect(response.status).toEqual(HttpStatus.OK)
                expect((response.body as Buffer).subarray(0, 5).toString()).toEqual('%PDF-')
            }
            it('create POST fixtures', async () => {
                await createPostFixtures()
            })
            it.each([
                // in_out: outgoing 100.5 + 200 + 1 + 0 (unrated), incoming 10; vat 20%
                ['customer', (): number => cdrCustomerId, 311.5, 62.3],
                // out: zones of the whole contract
                ['did', (): number => cdrCustomerId, 301.5, 60.3],
                // in: carrier cost of the call terminating at the peer
                ['peer', (): number => peerId, 30, 0],
                // out: reseller cost of the other reseller's call
                ['reseller', (): number => otherResellerContractId, 77, 0],
            ])('creates a %s invoice', async (category, contractId, net, vat) => {
                const response = await post({customer_id: contractId(), template_id: templates[category], period: '2025-01'})
                expect(response.status).toEqual(HttpStatus.CREATED)
                const invoice: InvoiceResponseDto = response.body.data[0]
                created[category] = invoice
                createdInvoiceIds.push(invoice.id)
                expect(invoice.customer_id).toEqual(contractId())
                expect(invoice.serial).toEqual(`INV202501${String(invoice.id).padStart(7, '0')}`)
                expect(new Date(invoice.period_start)).toEqual(new Date(2025, 0, 1))
                expect(new Date(invoice.period_end)).toEqual(new Date(2025, 0, 31, 23, 59, 59))
                expect(invoice.amount_net).toBeCloseTo(net, 6)
                expect(invoice.amount_vat).toBeCloseTo(vat, 6)
                expect(invoice.amount_total).toBeCloseTo(net + vat, 6)
                expect(invoice.generator).toBeNull()
                expect(invoice.sent_date).toBeNull()
                await expectPdf(invoice.id)
            })
            it('creates an invoice with period_start and period_end', async () => {
                const response = await post({
                    customer_id: cdrCustomerId, template_id: templates.customer,
                    period_start: '2025-01-10', period_end: '2025-01-20 10:00:00',
                })
                expect(response.status).toEqual(HttpStatus.CREATED)
                const invoice: InvoiceResponseDto = response.body.data[0]
                createdInvoiceIds.push(invoice.id)
                // 100.5 (10th), 10 (15th), 200 (20th 10:00)
                expect(invoice.amount_net).toBeCloseTo(310.5, 6)
                expect(new Date(invoice.period_end)).toEqual(new Date(2025, 0, 20, 10, 0, 0))
            })
            it('lists a call within the customer once in the in_out call list', async () => {
                const rows = await app.get(InvoiceMariadbRepository).readCalls({
                    contractId: cdrCustomerId,
                    contractType: InvoiceCdrContractType.Account,
                    costCategory: InvoiceCostCategory.Customer,
                    callDirection: InvoiceTemplateCallDirection.InOut,
                    start: new Date(2025, 0, 1),
                    end: new Date(2025, 0, 31, 23, 59, 59),
                }, true)
                // outgoing: 1st, 10th, 16th (within the customer), 20th, 25th; incoming: 15th
                expect(rows.map(r => [r.side, new Date(r.startTime * 1000).getDate()])).toEqual([
                    ['destination', 15],
                    ['source', 1],
                    ['source', 10],
                    ['source', 16],
                    ['source', 20],
                    ['source', 25],
                ])
            })
            it('writes the created invoice to the journal', async () => {
                const response = await get(`/api/invoices/${created.customer.id}/journal`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data.map((j: {operation: string}) => j.operation)).toContain('create')
            })
            it.each([
                ['without period', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: templates.customer})],
                ['with period_start after period_end', (): Record<string, unknown> => ({
                    customer_id: cdrCustomerId, template_id: templates.customer, period_start: '2025-01-10', period_end: '2025-01-01',
                })],
                ['with period_start equal to period_end', (): Record<string, unknown> => ({
                    customer_id: cdrCustomerId, template_id: templates.customer, period_start: '2025-01-10', period_end: '2025-01-10',
                })],
                ['with an invalid date', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: templates.customer, period_start: '2025-02-30'})],
                ['with an invalid period', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: templates.customer, period: '2025-13'})],
                ['without customer_id', (): Record<string, unknown> => ({template_id: templates.customer, period: '2025-01'})],
                ['with an unknown template', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: 999999999, period: '2025-01'})],
                ['with an unknown contract', (): Record<string, unknown> => ({customer_id: 999999999, template_id: templates.customer, period: '2025-01'})],
                ['for a peering contract with a customer template', (): Record<string, unknown> => ({customer_id: peerId, template_id: templates.customer, period: '2025-01'})],
                ['for a customer with a peer template', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: templates.peer, period: '2025-01'})],
                ['for a customer with a reseller template', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: templates.reseller, period: '2025-01'})],
                ['for a reseller contract with a peer template', (): Record<string, unknown> => ({customer_id: otherResellerContractId, template_id: templates.peer, period: '2025-01'})],
                ['for a customer of another reseller than the template', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: templates.other, period: '2025-01'})],
                ['for a terminated customer', (): Record<string, unknown> => ({customer_id: terminatedId, template_id: templates.customer, period: '2025-01'})],
            ])('does not create an invoice %s', async (_name, body) => {
                const response = await post(body())
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
            it.each([
                ['an unknown contract', (): Record<string, unknown> => ({customer_id: 999999999, template_id: templates.customer, period: '2025-01'}), '/customer_id', 'INVOICE_CONTRACT_NOT_FOUND'],
                ['an unknown template', (): Record<string, unknown> => ({customer_id: cdrCustomerId, template_id: 999999999, period: '2025-01'}), '/template_id', 'INVOICE_TEMPLATE_NOT_FOUND'],
                ['a period_start after period_end', (): Record<string, unknown> => ({
                    customer_id: cdrCustomerId, template_id: templates.customer, period_start: '2025-01-10', period_end: '2025-01-01',
                }), '/period_end', 'INVOICE_PERIOD_INVALID'],
            ])('points to the field of %s', async (_name, body, pointer, code) => {
                const response = await post(body())
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errorCode).toEqual(code)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([[pointer, code]])
            })
            it('does not keep the invoice when the template fails to render', async () => {
                const count = await db.billing.Invoice.countBy({contract_id: cdrCustomerId})
                const response = await post({customer_id: cdrCustomerId, template_id: templates.broken, period: '2025-01'})
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(JSON.stringify(response.body)).toMatch(/unknown marker/)
                expect(await db.billing.Invoice.countBy({contract_id: cdrCustomerId})).toEqual(count)
            })
            it('creates an invoice of its own customer as reseller', async () => {
                const response = await post({customer_id: cdrCustomerId, template_id: templates.customer, period: '2025-01'}, resellerCreds)
                expect(response.status).toEqual(HttpStatus.CREATED)
                // the carrier cost is not shown to resellers, the customer cost amounts are the same
                expect(response.body.data[0].amount_net).toBeCloseTo(311.5, 6)
                createdInvoiceIds.push(response.body.data[0].id)
                expect((await get(`/api/invoices/${response.body.data[0].id}`, resellerCreds)).status).toEqual(HttpStatus.OK)
            })
            it('does not create invoices with templates or contracts of others as reseller', async () => {
                const tt = [
                    {customer_id: peerId, template_id: templates.peer, period: '2025-01'},
                    {customer_id: otherResellerContractId, template_id: templates.reseller, period: '2025-01'},
                    {customer_id: cdrCustomerId, template_id: templates.other, period: '2025-01'},
                    {customer_id: otherCustomerId, template_id: templates.customer, period: '2025-01'},
                ]
                for (const body of tt) {
                    const response = await post(body, resellerCreds)
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                }
            })
            it('does not create invoices with other roles', async () => {
                const response = await post({customer_id: cdrCustomerId, template_id: templates.customer, period: '2025-01'}, ccareCreds)
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
            })
        })

        describe('DELETE', () => {
            it('deletes an invoice', async () => {
                const response = await request(app.getHttpServer())
                    .delete(`/api/invoices/${invoices.a1.id}`)
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toEqual([invoices.a1.id])
                expect((await get(`/api/invoices/${invoices.a1.id}`)).status).toEqual(HttpStatus.NOT_FOUND)
            })
            it('bulk deletes invoices', async () => {
                const response = await request(app.getHttpServer())
                    .delete('/api/invoices')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send([invoices.a2.id, invoices.b1.id])
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toEqual([invoices.a2.id, invoices.b1.id])
                expect((await get(`/api/invoices?serial=${prefix}*`)).body.total_count).toEqual(0)
            })
            it('writes the deletes to the journal', async () => {
                for (const name of ['a1', 'a2', 'a3', 'b1']) {
                    const response = await get(`/api/invoices/${invoices[name].id}/journal`)
                    expect(response.status).toEqual(HttpStatus.OK)
                    const journals = response.body.data
                    expect(journals.map((j: {operation: string}) => j.operation)).toContain('delete')
                }
            })
        })
    })

    describe('Invoice DELETE', () => {
        it('delete fixtures', async () => {
            if (createdInvoiceIds.length)
                await db.billing.Invoice.delete(createdInvoiceIds)
            await appService.db.query('DELETE FROM accounting.cdr WHERE call_id LIKE ?', [`${prefix}-cdr-%`])
            if (createdTemplateIds.length)
                await db.billing.InvoiceTemplate.delete(createdTemplateIds)
            if (createdSubscriberIds.length)
                await db.billing.VoipSubscriber.delete(createdSubscriberIds)
            // the invoices and billing mappings of the contracts are deleted with them
            const customerContractIds = createdContractIds.filter(id => id != otherResellerContractId)
            if (customerContractIds.length)
                await db.billing.Contract.delete(customerContractIds)
            if (createdContactIds.length)
                await db.billing.Contact.delete(createdContactIds)
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
            if (createdZoneIds.length)
                await appService.db.query('DELETE FROM billing.billing_zones_history WHERE id IN (?)', [createdZoneIds])
            if (domainId)
                await db.billing.Domain.delete(domainId)
            if (profileId)
                await db.billing.BillingProfile.delete(profileId)
        })
        it('delete created admins', async () => {
            for (const id of createdAdminIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/admins/${id}`)
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)
            }
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: In([creds.username, resellerCreds.username, ccareCreds.username]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
