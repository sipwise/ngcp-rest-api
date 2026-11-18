import {HttpStatus} from '@nestjs/common'
import {NestApplication} from '@nestjs/core'
import {OperationObject, ParameterObject, RequestBodyObject, ResponseObject, SchemaObject} from '@nestjs/swagger'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {AppModule} from '~/app.module'
import {DATE_TIME_DESCRIPTION_SUFFIXES} from '~/decorators/date-time-field.decorator'
import {SWAGGER_LANGUAGES, SwaggerLanguage, readLocalisationFile, readSwaggerStrings} from '~/helpers/swagger-i18n.helper'
import {createSwaggerDocument} from '~/helpers/swagger.helper'

// descriptions that carry only a scope or omission note
const WEAK_DESCRIPTION = /^(\w+ roles only|PBX \w+ only|read-only, ignored|kept when omitted)$/i
// generated in full by the document helpers, as prose
const GENERATED_PARAMETERS = [
    'expand',
    'inline',
    'soft_expand',
    'tz',
]

// the description as written in the code, without the notes the document adds
function sourceDescription(description = ''): string {
    let source = description.replace(/ ?\(expandable\)$/, '')
    for (const suffix of DATE_TIME_DESCRIPTION_SUFFIXES) {
        if (source.endsWith(suffix))
            source = source.slice(0, -suffix.length).replace(/\.? ?$/, '')
    }
    return source
}

function descriptionProblems(description: string | undefined): string[] {
    const source = sourceDescription(description)
    if (!source.trim())
        return ['missing']
    const problems: string[] = []
    if (WEAK_DESCRIPTION.test(source.trim()))
        problems.push('weak')
    if (source != source.trim())
        problems.push('whitespace')
    if (source.endsWith('.'))
        problems.push('trailing period')
    if (/^(The|A|An)\b/.test(source))
        problems.push('leading article')
    return problems
}

describe('Swagger', () => {
    let app: NestApplication

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = moduleRef.createNestApplication<NestApplication>()
        app.setGlobalPrefix('api')
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
        const collection = paths['/api/customercontacts']
        expect(bodySchema(collection.post).oneOf).toEqual([
            {$ref: '#/components/schemas/CustomerContactRequestDto'},
            {type: 'array', items: {$ref: '#/components/schemas/CustomerContactRequestDto'}, maxItems: 10000},
        ])
        expect(bodySchema(collection.put)).toEqual(expect.objectContaining({type: 'object', maxProperties: 10000}))
        expect(bodySchema(collection.patch, 'application/json-patch+json')).toEqual(expect.objectContaining({type: 'object', maxProperties: 10000}))
        for (const operation of [collection.post, collection.put, collection.patch]) {
            const tooLarge = (operation.responses['413'] as ResponseObject).content['application/json']
            expect(tooLarge.schema).toEqual({$ref: '#/components/schemas/ErrorResponse'})
            expect(tooLarge.example).toEqual(expect.objectContaining({errorCode: 'BULK_TOO_LARGE'}))
        }
        const item = paths['/api/customercontacts/{id}']
        expect(bodySchema(item.patch, 'application/json-patch+json').maxItems).toBeUndefined()
        expect(item.patch.responses['413']).toBeUndefined()
        expect(collection.get.responses['413']).toBeUndefined()
    })

    it('documents the answer of a POST and collections as plain objects of their items', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const responseSchema = (operation: OperationObject, code: string): Record<string, unknown> =>
            (operation.responses[code] as ResponseObject).content['application/json'].schema as Record<string, unknown>
        const subscriber = {$ref: '#/components/schemas/SubscriberResponseDto'}

        const created = responseSchema(paths['/api/subscribers'].post, '201')
        expect(created).toEqual(expect.objectContaining({type: 'object', required: ['total_count']}))
        expect(created).not.toHaveProperty('allOf')
        expect(created.properties).toEqual({
            total_count: expect.objectContaining({type: 'integer'}),
            data: expect.objectContaining({type: 'array', items: subscriber}),
            links: expect.objectContaining({type: 'array', items: {type: 'string'}}),
            ids: expect.objectContaining({type: 'array', items: {type: 'integer'}}),
        })
        const tokenIds = (responseSchema(paths['/api/auth/tokens'].post, '201').properties as Record<string, unknown>).ids
        expect(tokenIds).toEqual(expect.objectContaining({items: {type: 'string'}}))

        const collection = responseSchema(paths['/api/subscribers'].get, '200')
        expect(collection).toEqual(expect.objectContaining({type: 'object', required: ['total_count', 'data']}))
        expect(collection.properties).toEqual({
            total_count: expect.objectContaining({type: 'integer'}),
            data: expect.objectContaining({type: 'array', items: subscriber}),
        })

        const schemas = json.body.components.schemas
        expect(schemas).not.toHaveProperty('PaginatedDto')
        expect(schemas).not.toHaveProperty('CreateResponseDto')
        expect(schemas.SubscriberResponseDto.properties).not.toHaveProperty('resourceUrl')
    })

    it('documents one-or-many POST bodies and bulk PUT/PATCH bodies keyed by id', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        const bodySchema = (operation: OperationObject, type = 'application/json'): Record<string, unknown> =>
            (operation.requestBody as RequestBodyObject).content[type].schema as Record<string, unknown>
        const item = {$ref: '#/components/schemas/SubscriberRequestDto'}
        const patch = {$ref: '#/components/schemas/PatchDto'}

        const subscribers = paths['/api/subscribers']
        expect(bodySchema(subscribers.post).oneOf).toEqual([item, expect.objectContaining({type: 'array', items: item})])
        expect(bodySchema(subscribers.put)).toEqual(expect.objectContaining({type: 'object', additionalProperties: item}))
        expect(bodySchema(subscribers.patch, 'application/json-patch+json'))
            .toEqual(expect.objectContaining({type: 'object', additionalProperties: {type: 'array', items: patch}}))
        expect(bodySchema(paths['/api/subscribers/{id}'].patch, 'application/json-patch+json')).toEqual({type: 'array', items: patch})
        expect(bodySchema(paths['/api/customers/{customerId}/phonebook'].post).oneOf).toHaveLength(2)

        const postBodies = Object.values(paths)
            .map(pathItem => (pathItem.post?.requestBody as RequestBodyObject | undefined)?.content['application/json']?.schema)
        expect(postBodies.filter(schema => schema && 'type' in schema && schema.type == 'array')).toEqual([])
        expect(json.body.components.schemas.PatchDto.properties).toHaveProperty('from')
    })

    it('shows the schemas as flat tables, with their labels in every language', async () => {
        const page = await request(app.getHttpServer()).get('/api/')
        expect(page.text).toContain('window.ngcpSchemaTablePlugin = ')
        expect(page.text).toContain('options.plugins = [...(options.plugins || []), window.ngcpSchemaTablePlugin]')
        const keys = Object.keys(readSwaggerStrings('en').page).filter(key => key.startsWith('schema'))
        expect(keys.length).toBeGreaterThan(10)
        for (const lang of Object.keys(SWAGGER_LANGUAGES) as SwaggerLanguage[]) {
            const strings = (JSON.parse(readLocalisationFile(lang, 'swagger-page.json')) as {page: Record<string, string>}).page
            expect(keys.filter(key => !strings[key])).toEqual([])
        }
        const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js?lang=de')
        expect(init.text).toContain(JSON.stringify(readSwaggerStrings('de').page.schemaItemOf))
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

        const contracts = paths['/api/contracts'].get
        expect(parameter(contracts, 'expand').description).toMatch(/^Fields to resolve, comma separated: `contact_id`/)
        expect(parameter(contracts, 'soft_expand')).toBeDefined()
        expect(parameter(paths['/api/contracts/{id}'].patch, 'expand')).toBeUndefined()
        expect(parameter(paths['/api/auth/userinfo'].get, 'expand')).toBeUndefined()
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

        const inline = paths['/api/subscribers'].get.parameters.find(param => 'name' in param && param.name == 'inline')
        expect(inline).toEqual(expect.objectContaining({
            in: 'query',
            description: expect.stringMatching(/^Lazy fields .*: `alias_numbers`, `pbx_group_ids`, `pbx_groupmember_ids`\./),
        }))
        expect(inline).toEqual(expect.objectContaining({
            description: expect.stringMatching(/at most \d+ items, in page order while the response holds at most \d+ inlined items/),
        }))
        expect(parameterNames(paths['/api/subscribers/{id}'].get)).toContain('inline')
        expect(parameterNames(paths['/api/templates/invoices/{id}'].get)).not.toContain('inline')
        expect(parameterNames(paths['/api/subscribers/{id}'].put)).not.toContain('inline')

        expect(Object.keys(paths).filter(path => path.includes('@{field}'))).toEqual([])
        expect(Object.keys(paths).filter(path => path.startsWith('/api/subscribers/{subscriberId}/@')).sort()).toEqual([
            '/api/subscribers/{subscriberId}/@alias_numbers',
            '/api/subscribers/{subscriberId}/@pbx_group_ids',
            '/api/subscribers/{subscriberId}/@pbx_groupmember_ids',
        ])
        const aliasNumbers = paths['/api/subscribers/{subscriberId}/@alias_numbers'].get
        expect(aliasNumbers.operationId).toEqual('SubscriberController_readField_alias_numbers')
        expect(parameterNames(aliasNumbers)).toEqual(expect.arrayContaining(['subscriberId', 'page', 'rows', 'order_by', 'number', 'is_devid']))
        expect(parameterNames(aliasNumbers)).not.toContain('field')
        expect(JSON.stringify((aliasNumbers.responses['200'] as ResponseObject).content['application/json'].schema))
            .toContain('"items":{"$ref":"#/components/schemas/SubscriberAliasNumberResponseDto"}')
        const groupIds = paths['/api/subscribers/{subscriberId}/@pbx_group_ids'].get
        expect(JSON.stringify((groupIds.responses['200'] as ResponseObject).content['application/json'].schema))
            .toContain('"items":{"type":"object","required":["value"],"properties":{"value":{"type":"number"}}}')
        expect(parameterNames(groupIds)).toContain('value')
        expect(parameterNames(groupIds)).not.toContain('expand')
        expect(parameterNames(paths['/api/customers/{customerId}/@billing_profiles'].get)).toEqual(['customerId', 'page', 'rows', 'tz'])
        const conditionValues = paths['/api/header-manipulations/sets/{setId}/rules/{ruleId}/conditions/{conditionId}/@values'].get
        const queryNames = conditionValues.parameters.filter(param => 'in' in param && param.in == 'query').map(param => 'name' in param ? param.name : '')
        expect(queryNames).toEqual(expect.arrayContaining(['id', 'value', 'page', 'rows', 'order_by']))
        expect(queryNames).not.toContain('match_name')
        // link-only fields keep their own operations
        expect(paths['/api/templates/invoices/{id}/@vars'].get.operationId).toEqual('InvoiceTemplateController_readVars')
    })

    it('describes every schema property, parameter and operation in the v2 style', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const problems: string[] = []
        const report = (where: string, found: string[]): void => {
            if (found.length)
                problems.push(`${where}: ${found.join(', ')}`)
        }
        const schemas = json.body.components.schemas as Record<string, SchemaObject>
        for (const [name, schema] of Object.entries(schemas)) {
            for (const [field, property] of Object.entries(schema.properties ?? {}))
                report(`schema ${name}.${field}`, descriptionProblems((property as SchemaObject).description))
        }
        const paths = json.body.paths as Record<string, Record<string, OperationObject>>
        for (const [path, item] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(item)) {
                const where = `${method.toUpperCase()} ${path}`
                report(where, descriptionProblems(operation.summary))
                for (const param of operation.parameters as ParameterObject[]) {
                    const found = GENERATED_PARAMETERS.includes(param.name)
                        ? (param.description ? [] : ['missing'])
                        : descriptionProblems(param.description)
                    report(`${where} ${param.in} ${param.name}`, found)
                }
            }
        }
        expect(problems).toEqual([])
    })

    it('generates the operation summaries and the path parameters from the path', async () => {
        const json = await request(app.getHttpServer()).get('/api/swagger.json')
        expect(json.status).toEqual(HttpStatus.OK)
        const levels = json.body.paths['/api/ncos/sets/{setId}/levels/{id}']
        expect(levels.get.summary).toEqual('Get a level of an NCOS set')
        expect(levels.get.parameters).toEqual(expect.arrayContaining([
            expect.objectContaining({name: 'setId', in: 'path', required: true, description: 'Id of the NCOS set'}),
            expect.objectContaining({name: 'id', in: 'path', required: true, description: 'Id of the NCOS set level'}),
        ]))
        expect(json.body.paths['/api/ncos/sets/{setId}/levels'].post.parameters).toEqual(expect.arrayContaining([
            expect.objectContaining({name: 'setId', in: 'path', schema: {type: 'number'}}),
        ]))
        // delete routes take the id from the path or the body, swagger doesn't see it
        expect(json.body.paths['/api/admins/{id}'].delete).toEqual(expect.objectContaining({
            summary: 'Delete admins',
            parameters: expect.arrayContaining([expect.objectContaining({name: 'id', in: 'path', description: 'Id of the admin'})]),
        }))
        expect(json.body.paths['/api/bans/ips/{id}/journal'].get.summary).toEqual('List journal entries of an IP ban')
        expect(json.body.paths['/api/subscribers/{subscriberId}/@alias_numbers'].get.summary)
            .toEqual('List alias numbers of a subscriber')
        expect(json.body.paths['/api/fileshare'].post.summary).toEqual('Upload a file')
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
