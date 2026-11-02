import {HttpStatus} from '@nestjs/common'
import {NestApplication} from '@nestjs/core'
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
