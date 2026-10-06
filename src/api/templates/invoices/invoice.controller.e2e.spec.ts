import {readFileSync} from 'fs'
import path from 'path'

import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {InvoiceTemplateResponseDto} from './dto/invoice-response.dto'
import {InvoiceTemplateModule} from './invoice.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
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
    const creds = {username: 'administrator', password: 'administrator'}
    const resellerId = 1
    const templateName = `e2e-invoice-template-${Date.now()}`
    const svgType = {filename: 'template.svg', contentType: 'image/svg+xml'}

    const readData = async (id: number, url = `/templates/invoices/${id}`): Promise<request.Response> =>
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

        app.useGlobalPipes(new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

        await app.init()
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
            .post('/auth/jwt')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            it('creates invoice template with svg file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', templateName)
                    .field('reseller_id', resellerId)
                    .field('type', InvoiceTemplateType.SVG)
                    .field('call_direction', InvoiceTemplateCallDirection.InOut)
                    .field('category', InvoiceTemplateCategory.Customer)
                    .attach('file', defaultTemplate(InvoiceTemplateCategory.Customer), {contentType: 'image/svg+xml'})
                expect(response.status).toEqual(201)
                const template: InvoiceTemplateResponseDto = response.body[0]
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
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .send({name: `${templateName}-json`, category: InvoiceTemplateCategory.Peer})
                expect(response.status).toEqual(201)
                const id = response.body[0].id
                createdIds.push(id)
                expect(((await readData(id)).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Peer), 'utf8'))
            })
            it('creates invoice template with the default content without file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-default`)
                    .field('category', InvoiceTemplateCategory.Peer)
                expect(response.status).toEqual(201)
                const id = response.body[0].id
                createdIds.push(id)
                const data = await readData(id)
                expect(data.status).toEqual(200)
                expect((data.body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Peer), 'utf8'))
            })
            it('sanitizes uploaded svg content', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-sanitized`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<script>alert(1)</script><g class="page layer">[% rescontact.company %]</g>'), svgType)
                expect(response.status).toEqual(201)
                const id = response.body[0].id
                createdIds.push(id)
                const content = ((await readData(id)).body as Buffer).toString('utf8')
                expect(content).not.toMatch(/<script/i)
                expect(content).toMatch(/<g class="page">\[% rescontact.company %\]<\/g>/)
            })
            it('does not create invoice template with unknown variables', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-unknown-var`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>[% unknown_macro(1) %] [% rescontact.unknown_field %]</text>'), svgType)
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template using variables of another category', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-did-vars`)
                    .field('category', InvoiceTemplateCategory.Peer)
                    .attach('file', defaultTemplate(InvoiceTemplateCategory.Did), {contentType: 'image/svg+xml'})
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with unsupported directives', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-perl`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('[% PERL %]print "x"[% END %][% INCLUDE "/etc/passwd" %]'), svgType)
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with duplicate name', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', templateName)
                    .field('reseller_id', resellerId)
                    .attach('file', defaultTemplate(InvoiceTemplateCategory.Customer), {contentType: 'image/svg+xml'})
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with non svg file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-invalid`)
                    .field('reseller_id', resellerId)
                    .attach('file', Buffer.from('this is not an svg file'), {filename: 'template.txt', contentType: 'text/plain'})
                expect(response.status).toEqual(422)
            })
            it('does not create customer invoice template without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-no-reseller`)
                    .field('category', InvoiceTemplateCategory.Customer)
                expect(response.status).toEqual(422)
            })
            it('does not create peer invoice template with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-peer`)
                    .field('reseller_id', resellerId)
                    .field('category', InvoiceTemplateCategory.Peer)
                expect(response.status).toEqual(422)
            })
            it('does not create invoice template with unsupported type', async () => {
                const response = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-html`)
                    .field('reseller_id', resellerId)
                    .field('type', InvoiceTemplateType.HTML)
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('reads all invoice templates', async () => {
                const response = await request(app.getHttpServer())
                    .get('/templates/invoices')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                expect(Array.isArray(response.body[0])).toBe(true)
            })
            it('reads invoice template by id with all fields', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^application\/json/)
                // resourceUrl is only stripped by the ClassSerializerInterceptor, which is not set up here
                const keys = Object.keys(response.body).filter(k => k != 'resourceUrl').sort()
                expect(keys).toEqual(['call_direction', 'category', 'id', 'name', 'preview', 'reseller_id', 'type', 'vars'])
            })
            it('returns 404 for a non existing invoice template', async () => {
                const response = await request(app.getHttpServer())
                    .get('/templates/invoices/999999999')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
            it('reads svg content as is when requested with Accept: image/svg+xml', async () => {
                const response = await readData(createdIds[0], `/templates/invoices/${createdIds[0]}`)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^image\/svg\+xml/)
                expect(response.headers['content-disposition']).toEqual(`attachment; filename="${templateName}.svg"`)
                expect((response.body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('does not serve svg content via @data', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/templates/invoices/${createdIds[0]}/@data`)
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
            it('returns svg content without the aux template PROCESS directive', async () => {
                const response = await readData(createdIds[0])
                expect((response.body as Buffer).toString('utf8')).not.toMatch(/PROCESS/)
            })
            it('returns a pdf preview of the template', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/templates/invoices/${createdIds[0]}/@preview`)
                    .set(...authHeader)
                    .buffer(true)
                    .parse(bufferParser)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^application\/pdf/)
                expect(response.headers['content-disposition']).toMatch(/^inline; filename=".+\.pdf"$/)
                expect((response.body as Buffer).subarray(0, 5).toString('latin1')).toEqual('%PDF-')
            })
            it('does not render a preview of a template failing at runtime', async () => {
                const create = await request(app.getHttpServer())
                    .post('/templates/invoices')
                    .set(...authHeader)
                    .field('name', `${templateName}-div0`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>[% 1 / 0 %]</text>'), svgType)
                expect(create.status).toEqual(201)
                createdIds.push(create.body[0].id)
                const response = await request(app.getHttpServer())
                    .get(`/templates/invoices/${create.body[0].id}/@preview`)
                    .set(...authHeader)
                expect(response.status).toEqual(422)
            })
            it('returns 404 for the preview of a non existing invoice template', async () => {
                const response = await request(app.getHttpServer())
                    .get('/templates/invoices/999999999/@preview')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
            it('reads all variables supported by the customer category', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/templates/invoices/${createdIds[0]}/@vars`)
                    .set(...authHeader)
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
                    .get(`/templates/invoices/${createdIds[1]}/@vars`)
                    .set(...authHeader)
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
                    .put(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
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
                    .put(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>PUT [% invoice.serial %]</text>'), svgType)
                expect(response.status).toEqual(200)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8')).toMatch(/PUT \[% invoice.serial %\]/)
            })
            it('resets customised content to the default with json', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .send({name: `${templateName}-put`, reseller_id: resellerId})
                expect(response.status).toEqual(200)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('resets customised content to the default without file', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                expect(response.status).toEqual(200)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8'))
                    .toEqual(readFileSync(defaultTemplate(InvoiceTemplateCategory.Customer), 'utf8'))
            })
            it('does not replace content with unknown variables', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .field('name', `${templateName}-put`)
                    .field('reseller_id', resellerId)
                    .attach('file', svg('<text>[% invoice.unknown %]</text>'), svgType)
                expect(response.status).toEqual(422)
            })
        })

        describe('PATCH', () => {
            it('patches name and keeps content', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/name', value: `${templateName}-patch`}])
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(`${templateName}-patch`)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8')).toMatch(/PUT \[% invoice.serial %\]/)
            })
            it('does not patch the svg content with json patch', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/data', value: svg('<text>JSON</text>').toString()}])
                expect(response.status).toEqual(422)
            })
            it('does not patch svg content with unknown variables', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .attach('file', svg('<text>[% did_zones.size %]</text>'), svgType)
                expect(response.status).toEqual(422)
            })
            it('patches svg content with multipart file upload', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .field('name', `${templateName}-multipart`)
                    .attach('file', svg('<text>MULTIPART [% custcontact.company %]</text>'), svgType)
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(`${templateName}-multipart`)
                expect(((await readData(createdIds[0])).body as Buffer).toString('utf8')).toMatch(/MULTIPART/)
            })
            it('does not patch unknown multipart fields', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .field('unknown', 'value')
                expect(response.status).toEqual(422)
            })
            it('does not patch unsupported category', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/category', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('does not change the category of an existing template', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/templates/invoices/${createdIds[0]}`)
                    .set(...authHeader)
                    .field('category', InvoiceTemplateCategory.Peer)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toMatch(/can not be changed/)
            })
        })

        describe('DELETE', () => {
            it('deletes created invoice templates', async () => {
                for (const id of createdIds) {
                    const response = await request(app.getHttpServer())
                        .delete(`/templates/invoices/${id}`)
                        .set(...authHeader)
                    expect(response.status).toEqual(200)
                }
            })
        })
    })
})
