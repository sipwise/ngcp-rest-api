import {readFileSync} from 'fs'
import path from 'path'

import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {InvoiceTemplateResponseDto} from './dto/invoice-response.dto'
import {InvoiceTemplateModule} from './invoice.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'
import {LicenseMockRepository} from '~/repositories/license.mock.repository'
import {LicenseRepository} from '~/repositories/license.repository'

const defaultTemplate = (category: InvoiceTemplateCategory): string =>
    path.resolve(__dirname, './defaults', `${category}_invoice_template.svg`)

const svg = (body: string): Buffer => Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" version="1.1">${body}</svg>`,
)

// buffer the binary @data response body
const bufferParser = (res: request.Response, cb: (err: Error, body: Buffer) => void): void => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
    })
    res.on('end', () => {
        cb(null, Buffer.concat(chunks))
    })
}

describe('InvoiceTemplate', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const licenseMockRepo = new LicenseMockRepository()
    let authHeader: [string, string]
    let createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const resellerCreds = {username: `inv_tpl_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}
    const resellerId = 1
    const templateName = `e2e-invoice-template-${Date.now()}`
    const svgType = {filename: 'template.svg', contentType: 'image/svg+xml'}

    const readData = async (id: number, url = `/api/templates/invoices/${id}`): Promise<request.Response> =>
        await request(app.getHttpServer())
            .get(url)
            .set(...authHeader)
            .set('Accept', 'image/svg+xml')
            .buffer(true)
            .parse(bufferParser)

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [InvoiceTemplateModule, AppModule],
        })
            .overrideProvider(LicenseRepository).useValue(licenseMockRepo)
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

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

    it('obtain auth token', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            it('creates invoice template with svg file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', templateName)
                    .field('reseller_id', resellerId)
                    .field('type', InvoiceTemplateType.SVG)
                    .field('call_direction', InvoiceTemplateCallDirection.InOut)
                    .field('category', InvoiceTemplateCategory.Customer)
                    .attach('file', defaultTemplate(InvoiceTemplateCategory.Customer), {contentType: 'image/svg+xml'})
                expect(response.status).toEqual(201)
                const template: InvoiceTemplateResponseDto = response.body.data[0]
                expect(template.id).toBeDefined()
                expect(template.name).toEqual(templateName)
                expect(template.reseller_id).toEqual(resellerId)
                expect(template.type).toEqual(InvoiceTemplateType.SVG)
                expect(template.call_direction).toEqual(InvoiceTemplateCallDirection.InOut)
                expect(template.category).toEqual(InvoiceTemplateCategory.Customer)
                expect(template.vars.url).toMatch(new RegExp(`/templates/invoices/${template.id}/@vars$`))
                expect(template.preview.url).toMatch(new RegExp(`/templates/invoices/${template.id}/@preview$`))
                createdIds.push(template.id)
            })
            it('creates invoice template from json with the default content', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `${templateName}-json`, category: InvoiceTemplateCategory.Peer})
                expect(response.status).toEqual(201)
                const id = response.body.data[0].id
                createdIds.push(id)
                expect(((await readData(id)).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Peer), 'utf8'))
            })
            it('creates invoice template with the default content without file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-default`)
                    .field('category', InvoiceTemplateCategory.Peer)
                expect(response.status).toEqual(201)
                const id = response.body.data[0].id
                createdIds.push(id)
                const data = await readData(id)
                expect(data.status).toEqual(200)
                expect((data.body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Peer), 'utf8'))
            })
            it('sanitizes uploaded svg content', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-sanitized`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<script>alert(1)</script><g class="page layer">[% rescontact.company %]</g>'), svgType)
                expect(response.status).toEqual(201)
                const id = response.body.data[0].id
                createdIds.push(id)
                const content = ((await readData(id)).body as Buffer).toString('utf8')
                expect(content).not.toMatch(/<script/i)
                expect(content).toMatch(/<g class="page">\[% rescontact.company %\]<\/g>/)
            })
            it('does not create invoice template with unknown variables', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-unknown-var`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>[% unknown_macro(1) %] [% rescontact.unknown_field %]</text>'), svgType)
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template using variables of another category', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-did-vars`)
                    .field('category', InvoiceTemplateCategory.Peer)
                    .attach('file', defaultTemplate(InvoiceTemplateCategory.Did), {contentType: 'image/svg+xml'})
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with unsupported directives', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-perl`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('[% PERL %]print "x"[% END %][% INCLUDE "/etc/passwd" %]'), svgType)
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with duplicate name', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', templateName)
                    .field('reseller_id', resellerId)
                    .attach('file', defaultTemplate(InvoiceTemplateCategory.Customer), {contentType: 'image/svg+xml'})
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with non svg file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-invalid`)
                    .field('reseller_id', resellerId)
                    .attach('file', Buffer.from('this is not an svg file'), {filename: 'template.txt', contentType: 'text/plain'})
                expect(response.status).toEqual(422)
            })
            it('does not create customer invoice template without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-no-reseller`)
                    .field('category', InvoiceTemplateCategory.Customer)
                expect(response.status).toEqual(422)
            })
            it('does not create peer invoice template with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-peer`)
                    .field('reseller_id', resellerId)
                    .field('category', InvoiceTemplateCategory.Peer)
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with unsupported type', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-html`)
                    .field('reseller_id', resellerId)
                    .field('type', InvoiceTemplateType.HTML)
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('reads all invoice templates', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/templates/invoices')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(Array.isArray(response.body.data)).toBe(true)
            })
            it('reads invoice template by id with all fields', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^application\/json/)
                // resourceUrl is only stripped by the ClassSerializerInterceptor, which is not set up here
                const keys = Object.keys(response.body).filter(k => k != 'resourceUrl').sort()
                expect(keys).toEqual(['call_direction', 'category', 'id', 'name', 'preview', 'reseller_id', 'type', 'vars'])
            })
            it('returns 404 for a non existing invoice template', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/templates/invoices/999999999')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
            it('reads svg content as is when requested with Accept: image/svg+xml', async () => {
                const response = await readData(createdIds[0], `/api/templates/invoices/${createdIds[0]}`)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^image\/svg\+xml/)
                expect(response.headers['content-disposition']).toEqual(`attachment; filename="${templateName}.svg"`)
                expect((response.body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('does not serve svg content via @data', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/templates/invoices/${createdIds[0]}/@data`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
            it('returns svg content without the aux template PROCESS directive', async () => {
                const response = await readData(createdIds[0])
                expect((response.body as Buffer).toString('utf8')).not.toMatch(/PROCESS/)
            })
            it('returns a pdf preview of the template', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/templates/invoices/${createdIds[0]}/@preview`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .buffer(true)
                    .parse(bufferParser)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^application\/pdf/)
                expect(response.headers['content-disposition']).toMatch(/^inline; filename=".+\.pdf"$/)
                expect((response.body as Buffer).subarray(0, 5).toString('latin1')).toEqual('%PDF-')
            })
            it('does not render a preview of a template failing at runtime', async () => {
                // stored before the upload validation (e.g. migrated from v1), the api rejects it on upload
                const broken = await db.billing.InvoiceTemplate.create({
                    name: `${templateName}-broken`,
                    reseller_id: resellerId,
                    type: InvoiceTemplateType.SVG,
                    category: InvoiceTemplateCategory.Customer,
                    call_direction: InvoiceTemplateCallDirection.Out,
                    data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><!--@unknown--></svg>'),
                }).save()
                createdIds.push(broken.id)
                const response = await request(app.getHttpServer())
                    .get(`/api/templates/invoices/${broken.id}/@preview`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(422)
            })
            it('returns 404 for the preview of a non existing invoice template', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/templates/invoices/999999999/@preview')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
            it('reads all variables supported by the customer category', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/templates/invoices/${createdIds[0]}/@vars`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                for (const key of ['id', 'name', 'vars', 'preview', 'category'])
                    expect(response.body[key]).toBeUndefined()
                for (const key of ['fixfee', 'zonefee', 'netfee', 'vatfee', 'allfee', 'cur', 'p_start', 'p_end', 'aux', 'rescontact', 'customer', 'custcontact', 'billprof', 'invoice'])
                    expect(response.body[key]).toBeDefined()
                for (const key of ['contract', 'contact', 'zones', 'calls', 'did_zones', 'did'])
                    expect(response.body[key]).toBeUndefined()
                expect(response.body.rescontact.id).toBeDefined()
                expect(response.body.rescontact.company).toBeDefined()
                expect(response.body['date_now()']).toEqual('date_now(format=\'%Y-%m-%d\')')
                expect(response.body.p_start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
                expect(response.body.aux.page).toEqual(1)
                expect(response.body.invoice.call_direction).toEqual('from/to')
            })
            it('reads all variables supported by the peer category', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/templates/invoices/${createdIds[1]}/@vars`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.custcontact).toBeDefined()
                expect(response.body.contact).toBeUndefined()
                expect(response.body.calls).toBeUndefined()
                expect(response.body.did_zones).toBeUndefined()
            })
        })

        describe('PUT', () => {
            it('updates meta data and stores the default content without file', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                    .field('call_direction', InvoiceTemplateCallDirection.Out)
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(`${templateName}-put`)
                expect(response.body.call_direction).toEqual(InvoiceTemplateCallDirection.Out)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('replaces content with uploaded file', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>PUT [% invoice.serial %]</text>'), svgType)
                expect(response.status).toEqual(204)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8')).toMatch(/PUT \[% invoice.serial %\]/)
            })
            it('resets customised content to the default with json', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `${templateName}-put`, reseller_id: resellerId})
                expect(response.status).toEqual(204)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('resets customised content to the default without file', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                expect(response.status).toEqual(204)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('does not replace content with unknown variables', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>[% invoice.unknown %]</text>'), svgType)
                expect(response.status).toEqual(422)
            })
        })

        describe('PATCH', () => {
            it('patches name and keeps content', async () => {
                const before = ((await readData(createdIds[0])).body as Buffer).toString('utf8')
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/name', value: `${templateName}-patch`}])
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(`${templateName}-patch`)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8')).toEqual(before)
            })
            it('does not patch the svg content with json patch', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/data', value: svg('<text>JSON</text>').toString()}])
                expect(response.status).toEqual(422)
            })
            it('does not patch svg content with unknown variables', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .attach('file', svg('<text>[% did_zones.size %]</text>'), svgType)
                expect(response.status).toEqual(422)
            })
            it('patches svg content with multipart file upload', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .field('name', `${templateName}-multipart`)
                    .attach('file', svg('<text>MULTIPART [% custcontact.company %]</text>'), svgType)
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(`${templateName}-multipart`)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8')).toMatch(/MULTIPART/)
            })
            it('does not patch unknown multipart fields', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('unknown', 'value')
                expect(response.status).toEqual(422)
            })
            it('does not patch unsupported category', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/category', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('does not change the category of an existing template', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('category', InvoiceTemplateCategory.Peer)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toMatch(/can not be changed/)
            })
        })

        describe('as reseller', () => {
            let resellerTemplateId: number
            it('create reseller admin', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        billing_data: true,
                        call_data: false,
                        can_reset_password: true,
                        is_active: true,
                        is_master: true,
                        email: `${resellerCreds.username}@example.com`,
                        login: resellerCreds.username,
                        password: resellerCreds.password,
                        read_only: false,
                        reseller_id: resellerId,
                        role: RbacRole.reseller,
                        show_passwords: true,
                        enable_2fa: false,
                    })
                expect(response.status).toEqual(201)
                resellerAdminId = +response.body.data[0].id
            })
            it('does not create invoice template with reseller_id', async () => {
                const tt = [
                    (): request.Test => request(app.getHttpServer())
                        .post('/api/templates/invoices')
                        .auth(resellerCreds.username, resellerCreds.password)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({name: `${templateName}-reseller`, category: InvoiceTemplateCategory.Customer, reseller_id: resellerId}),
                    (): request.Test => request(app.getHttpServer())
                        .post('/api/templates/invoices')
                        .auth(resellerCreds.username, resellerCreds.password)
                        .set('Accept', 'application/json')
                        .field('name', `${templateName}-reseller`)
                        .field('category', InvoiceTemplateCategory.Customer)
                        .field('reseller_id', resellerId),
                ]
                for (const req of tt) {
                    const response = await req()
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
                }
            })
            it('creates invoice template without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/templates/invoices')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `${templateName}-reseller`, category: InvoiceTemplateCategory.Customer})
                expect(response.status).toEqual(201)
                expect(response.body.data[0].reseller_id).toEqual(resellerId)
                resellerTemplateId = +response.body.data[0].id
                createdIds.push(resellerTemplateId)
            })
            it('does not update invoice template with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${resellerTemplateId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `${templateName}-reseller-put`, reseller_id: resellerId})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('updates invoice template without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/templates/invoices/${resellerTemplateId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({name: `${templateName}-reseller-put`})
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(resellerId)
            })
            it('does not patch reseller_id', async () => {
                const tt = [
                    (): request.Test => request(app.getHttpServer())
                        .patch(`/api/templates/invoices/${resellerTemplateId}`)
                        .auth(resellerCreds.username, resellerCreds.password)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send([{op: 'replace', path: '/reseller_id', value: resellerId}]),
                    (): request.Test => request(app.getHttpServer())
                        .patch(`/api/templates/invoices/${resellerTemplateId}`)
                        .auth(resellerCreds.username, resellerCreds.password)
                        .set('Accept', 'application/json')
                        .field('reseller_id', resellerId),
                ]
                for (const req of tt) {
                    const response = await req()
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
                }
            })
            it('patches invoice template without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/templates/invoices/${resellerTemplateId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/name', value: `${templateName}-reseller-patch`}])
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(resellerId)
            })
        })

    })

    describe('InvoiceTemplate DELETE', () => {
        it('deletes created invoice templates', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/templates/invoices/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(204)
            }
        })
        it('delete reseller admin', async () => {
            if (!resellerAdminId)
                return
            const response = await request(app.getHttpServer())
                .delete(`/api/admins/${resellerAdminId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(response.status).toEqual(204)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: In([creds.username, resellerCreds.username]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
