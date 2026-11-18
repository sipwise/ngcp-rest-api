import {HttpStatus} from '@nestjs/common'
import {NestApplication} from '@nestjs/core'
import {OperationObject, RequestBodyObject, ResponseObject} from '@nestjs/swagger'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {AppModule} from '~/app.module'
import {readSwaggerStrings} from '~/helpers/swagger-i18n.helper'
import {createSwaggerDocument} from '~/helpers/swagger.helper'

describe('Swagger', () => {
    let app: NestApplication

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = moduleRef.createNestApplication<NestApplication>()
        createSwaggerDocument(app, 'api')
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('serves the swagger ui with the download menu and the guide tabs', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/')
        expect(response.status).toEqual(HttpStatus.OK)
        expect(response.text).toContain('download-pdf')
        expect(response.text).toContain('/swagger.pdf')
        expect(response.text).toContain('guide-nav-tab')
        expect(response.text).toContain('language-switch')
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js')
        expect(init.text).toContain('PDF (API only)')
    })

    it('serves the documentation as pdf without authentication', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/swagger.pdf')
            .buffer(true)
            .parse((res, callback) => {
                const chunks: Buffer[] = []
                res.on('data', (chunk: Buffer) => chunks.push(chunk))
                res.on('end', () => callback(null, Buffer.concat(chunks)))
            })
        expect(response.status).toEqual(HttpStatus.OK)
        expect(response.headers['content-type']).toEqual('application/pdf')
        expect(response.headers['content-disposition']).toMatch(/^attachment; filename="ngcp-api-2-documentation-\d{14}\.pdf"$/)
        expect((response.body as Buffer).subarray(0, 5).toString()).toEqual('%PDF-')
    })

    it('serves the api reference without the guide as pdf', async () => {
        const full = await request(app.getHttpServer()).get('/api/swagger.pdf').buffer(true).parse((res, callback) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        const apiOnly = await request(app.getHttpServer()).get('/api/swagger.pdf?api_only=1').buffer(true).parse((res, callback) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        expect(apiOnly.status).toEqual(HttpStatus.OK)
        expect(apiOnly.headers['content-disposition']).toMatch(/^attachment; filename="ngcp-api-2-reference-\d{14}\.pdf"$/)
        expect((apiOnly.body as Buffer).subarray(0, 5).toString()).toEqual('%PDF-')
        expect((apiOnly.body as Buffer).length).toBeLessThan((full.body as Buffer).length)
    })

    it('serves the documentation with only the curl usage examples as pdf', async () => {
        const full = await request(app.getHttpServer()).get('/api/swagger.pdf').buffer(true).parse((res, callback) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        const curl = await request(app.getHttpServer()).get('/api/swagger.pdf?usage=curl').buffer(true).parse((res, callback) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        expect(curl.status).toEqual(HttpStatus.OK)
        expect(curl.headers['content-disposition']).toMatch(/^attachment; filename="ngcp-api-2-documentation-curl-\d{14}\.pdf"$/)
        expect((curl.body as Buffer).subarray(0, 5).toString()).toEqual('%PDF-')
        expect((curl.body as Buffer).length).toBeLessThan((full.body as Buffer).length)
    })

    it('starts the page in english, with the page data only in the init script', async () => {
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js')
        expect(init.status).toEqual(HttpStatus.OK)
        expect(init.headers['cache-control']).toEqual('no-cache')
        expect(init.text).toContain('"x-ngcp-page"')
        expect(init.text).toMatch(/"lang": ?"en"/)
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.body.info.title).toEqual(readSwaggerStrings('en').page.title)
        expect(json.body.info['x-ngcp-page']).toBeUndefined()
    })

    it('serves the page in the language of the language switch cookie', async () => {
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js').set('Cookie', 'ngcp-api-lang=de')
        expect(init.status).toEqual(HttpStatus.OK)
        expect(init.text).toMatch(/"lang": ?"de"/)
        expect(init.text).toContain(JSON.stringify(readSwaggerStrings('de').page.title))
    })

    it('ignores unknown languages', async () => {
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js').set('Cookie', 'ngcp-api-lang=xx')
        expect(init.text).toMatch(/"lang": ?"en"/)
        const json = await request(app.getHttpServer()).get('/api/swagger.json?lang=xx')
        expect(json.body.info.title).toEqual(readSwaggerStrings('en').page.title)
    })

    it('describes every error response with the ErrorResponse schema', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const schemas = json.body.components.schemas
        expect(schemas.ErrorResponse.required).toEqual(['tx', 'statusCode', 'path', 'method', 'error', 'errorCode', 'message'])
        expect(schemas.ErrorResponse.properties.errors.items).toEqual({$ref: '#/components/schemas/ErrorEntry'})
        expect(schemas.ErrorEntry.required).toEqual(['code', 'message'])
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const operations = Object.values(paths).flatMap(item => Object.values(item))
        expect(operations.length).toBeGreaterThan(100)
        for (const operation of operations) {
            for (const code of ['4XX', '5XX'])
                expect((operation.responses[code] as ResponseObject).content['application/json'].schema).toEqual({$ref: '#/components/schemas/ErrorResponse'})
        }
    })

    it('documents the request limits: rows maximum, bulk body items and their 413', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const rows = Object.values(paths).flatMap(item => Object.values(item))
            .flatMap(operation => operation.parameters.filter(param => 'name' in param && param.name == 'rows'))
        expect(rows.length).toBeGreaterThan(50)
        for (const param of rows)
            expect(param).toEqual(expect.objectContaining({schema: expect.objectContaining({maximum: 10000})}))

        const bodySchema = (operation: OperationObject, type = 'application/json'): Record<string, unknown> =>
            (operation.requestBody as RequestBodyObject).content[type].schema as Record<string, unknown>
        const collection = paths['/customercontacts']
        expect(bodySchema(collection.post)).toEqual(expect.objectContaining({type: 'array', maxItems: 10000}))
        expect(bodySchema(collection.put)).toEqual(expect.objectContaining({type: 'object', maxProperties: 10000}))
        expect(bodySchema(collection.patch, 'application/json-patch+json')).toEqual(expect.objectContaining({type: 'object', maxProperties: 10000}))
        for (const operation of [collection.post, collection.put, collection.patch]) {
            const tooLarge = (operation.responses['413'] as ResponseObject).content['application/json']
            expect(tooLarge.schema).toEqual({$ref: '#/components/schemas/ErrorResponse'})
            expect(tooLarge.example).toEqual(expect.objectContaining({errorCode: 'BULK_TOO_LARGE'}))
        }
        const item = paths['/customercontacts/{id}']
        expect(bodySchema(item.patch, 'application/json-patch+json').maxItems).toBeUndefined()
        expect(item.patch.responses['413']).toBeUndefined()
        expect(collection.get.responses['413']).toBeUndefined()
    })

    it('documents tz on every operation and the timezone kind of date/time fields', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        for (const operation of Object.values(paths).flatMap(item => Object.values(item))) {
            const tz = operation.parameters.filter(param => 'name' in param && param.name == 'tz')
            expect(tz).toEqual([expect.objectContaining({in: 'query', required: false})])
        }
        const schemas = json.body.components.schemas
        expect(schemas.ContactResponseDto.properties.create_timestamp).toEqual(expect.objectContaining({
            type: 'string',
            format: 'date-time',
            'x-timezone': 'user',
            description: expect.stringMatching(/^Time of creation, null if unknown\. RFC 3339 with offset/),
        }))
        expect(schemas.CustomerBillingProfileResponseDto.properties.start).toEqual(expect.objectContaining({
            type: 'string',
            format: 'local-date-time',
            'x-timezone': 'platform',
        }))
    })

    it('documents expand per operation and the <field>_expand properties with the target schema', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const parameter = (operation: OperationObject, name: string): {description?: string} | undefined =>
            operation.parameters.find(param => 'name' in param && param.name == name) as {description?: string} | undefined

        const contracts = paths['/contracts'].get
        expect(parameter(contracts, 'expand').description).toMatch(/^Fields to resolve, comma separated: `contact_id`/)
        expect(parameter(contracts, 'soft_expand')).toBeDefined()
        expect(parameter(paths['/contracts/{id}'].patch, 'expand')).toBeUndefined()
        expect(parameter(paths['/auth/userinfo'].get, 'expand')).toBeUndefined()
        expect(JSON.stringify(json.body)).not.toContain('x-ngcp-no-expand')

        const schemas = json.body.components.schemas
        expect(schemas.ContractResponseDto.properties.contact_id.description).toMatch(/\(expandable\)$/)
        expect(schemas.ContractResponseDto.properties.contact_id_expand).toEqual(expect.objectContaining({
            allOf: [{$ref: '#/components/schemas/ContactResponseDto'}],
            nullable: true,
        }))
        expect(schemas.SubscriberResponseDto.properties.pbx_group_ids_expand).toEqual(expect.objectContaining({
            type: 'array',
            items: {$ref: '#/components/schemas/SubscriberResponseDto'},
        }))
        // /auth/* never expands, its response classes keep their plain schema
        expect(schemas.UserinfoResponseDto.properties).not.toHaveProperty('reseller_id_expand')
        expect(schemas.UserinfoResponseDto.properties.reseller_id.description ?? '').not.toContain('(expandable)')
    })

    it('documents lazy fields as link or data, inline and one @<field> operation per field', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const parameterNames = (operation: OperationObject): string[] =>
            operation.parameters.map(param => 'name' in param ? param.name : '')
        const link = {$ref: '#/components/schemas/LazyFieldLink'}

        const schemas = json.body.components.schemas
        expect(schemas.LazyFieldLink.required).toEqual(['type', 'url'])
        expect(schemas.SubscriberResponseDto.properties.alias_numbers.oneOf).toEqual([
            link,
            {type: 'array', items: {$ref: '#/components/schemas/SubscriberAliasNumberResponseDto'}},
        ])
        expect(schemas.SubscriberResponseDto.properties.pbx_group_ids.description).toMatch(/\(expandable\)$/)
        expect(schemas.InvoiceTemplateResponseDto.properties.vars.allOf).toEqual([link])

        const inline = paths['/subscribers'].get.parameters.find(param => 'name' in param && param.name == 'inline')
        expect(inline).toEqual(expect.objectContaining({
            in: 'query',
            description: expect.stringMatching(/^Lazy fields .*: `alias_numbers`, `pbx_group_ids`, `pbx_groupmember_ids`\./),
        }))
        expect(inline).toEqual(expect.objectContaining({
            description: expect.stringMatching(/at most \d+ items, in page order while the response holds at most \d+ inlined items/),
        }))
        expect(parameterNames(paths['/subscribers/{id}'].get)).toContain('inline')
        expect(parameterNames(paths['/templates/invoices/{id}'].get)).not.toContain('inline')
        expect(parameterNames(paths['/subscribers/{id}'].put)).not.toContain('inline')

        expect(Object.keys(paths).filter(path => path.includes('@{field}'))).toEqual([])
        expect(Object.keys(paths).filter(path => path.startsWith('/subscribers/{subscriberId}/@')).sort()).toEqual([
            '/subscribers/{subscriberId}/@alias_numbers',
            '/subscribers/{subscriberId}/@pbx_group_ids',
            '/subscribers/{subscriberId}/@pbx_groupmember_ids',
        ])
        const aliasNumbers = paths['/subscribers/{subscriberId}/@alias_numbers'].get
        expect(aliasNumbers.operationId).toEqual('SubscriberController_readField_alias_numbers')
        expect(parameterNames(aliasNumbers)).toEqual(expect.arrayContaining(['subscriberId', 'page', 'rows', 'order_by', 'number', 'is_devid']))
        expect(parameterNames(aliasNumbers)).not.toContain('field')
        expect(JSON.stringify((aliasNumbers.responses['200'] as ResponseObject).content['application/json'].schema))
            .toContain('"items":{"$ref":"#/components/schemas/SubscriberAliasNumberResponseDto"}')
        const groupIds = paths['/subscribers/{subscriberId}/@pbx_group_ids'].get
        expect(JSON.stringify((groupIds.responses['200'] as ResponseObject).content['application/json'].schema))
            .toContain('"items":{"type":"object","required":["value"],"properties":{"value":{"type":"number"}}}')
        expect(parameterNames(groupIds)).toContain('value')
        expect(parameterNames(groupIds)).not.toContain('expand')
        expect(parameterNames(paths['/customers/{customerId}/@billing_profiles'].get)).toEqual(['customerId', 'page', 'rows', 'tz'])
        const conditionValues = paths['/header-manipulations/sets/{setId}/rules/{ruleId}/conditions/{conditionId}/@values'].get
        const queryNames = conditionValues.parameters.filter(param => 'in' in param && param.in == 'query').map(param => 'name' in param ? param.name : '')
        expect(queryNames).toEqual(expect.arrayContaining(['id', 'value', 'page', 'rows', 'order_by']))
        expect(queryNames).not.toContain('match_name')
        // link-only fields keep their own operations
        expect(paths['/templates/invoices/{id}/@vars'].get.operationId).toEqual('InvoiceTemplateController_readVars')
    })

    it('documents no parameter twice in an operation', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const duplicates: string[] = []
        for (const [path, item] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(item)) {
                const names = operation.parameters.map(param => 'name' in param ? param.name : param.$ref)
                const repeated = names.filter((name, index) => names.indexOf(name) != index)
                if (repeated.length)
                    duplicates.push(`${method.toUpperCase()} ${path}: ${repeated.join(', ')}`)
            }
        }
        expect(duplicates).toEqual([])
    })

    it('serves the localised document and pdf with ?lang=', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json?lang=fr')
        expect(json.status).toEqual(HttpStatus.OK)
        expect(json.body.info.title).toEqual(readSwaggerStrings('fr').page.title)
        expect(json.body.info['x-ngcp-page']).toBeUndefined()
        const pdf = await request(app.getHttpServer()).get('/api/swagger.pdf?lang=it&api_only=1').buffer(true).parse((res, callback) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        expect(pdf.status).toEqual(HttpStatus.OK)
        expect(pdf.headers['content-disposition']).toMatch(/^attachment; filename="ngcp-api-2-reference-it-\d{14}\.pdf"$/)
        expect((pdf.body as Buffer).subarray(0, 5).toString()).toEqual('%PDF-')
    })

    it('refers the page to the init script of its language, which proxies may cache', async () => {
        for (const path of ['/api', '/api/', '/api/index.html']) {
            const page = await request(app.getHttpServer()).get(path)
            expect(page.text).toMatch(/swagger-ui-init\.js\?lang=en&v=\w+"/)
        }
        const localised = await request(app.getHttpServer()).get('/api/').set('Cookie', 'ngcp-api-lang=es')
        expect(localised.text).toMatch(/swagger-ui-init\.js\?lang=es&v=\w+"/)
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js?lang=es&v=1')
        expect(init.text).toMatch(/"lang": ?"es"/)
    })

    it('passes the package version without its upstream part to the page', async () => {
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js')
        expect(init.text).toMatch(/"versions": ?\{[^}]*"api": ?"mr[^"~]*/)
    })

    it('gives the page the start of the server for the pdf downloads', async () => {
        const page = await request(app.getHttpServer()).get('/api/')
        const build = /swagger-ui-init\.js\?lang=en&v=(\w+)"/.exec(page.text)?.[1]
        const init = await request(app.getHttpServer()).get(`/api/swagger-ui-init.js?lang=en&v=${build}`)
        expect(init.text).toMatch(new RegExp(`"build": ?"${build}"`))
    })
})
