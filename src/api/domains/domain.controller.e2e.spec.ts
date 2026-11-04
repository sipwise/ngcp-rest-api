import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {DomainModule} from './domain.module'
import {DomainResponseDto} from './dto/domain-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Domain', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let resellerAdminId: number
    const createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}
    const startedAt = Date.now() / 1000
    const resellerCreds = {username: `domain_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}
    const domainSuffix = `${Date.now()}.e2e.example.org`

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DomainModule, AppModule],
        })
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
            it('create domain', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `admin.${domainSuffix}`, reseller_id: 1})
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail create domain without reseller_id', async () => {
                const tt = [
                    {domain: `admin-none.${domainSuffix}`},
                    {domain: `admin-none.${domainSuffix}`, reseller_id: null},
                ]
                for (const domain of tt) {
                    const response = await request(app.getHttpServer())
                        .post('/api/domains')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send(domain)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
                }
            })
            it('fail create domain with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `admin-invalid.${domainSuffix}`, reseller_id: 999911111})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created domain', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/domains/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const domain: DomainResponseDto = response.body
                expect(domain.domain).toEqual(`admin.${domainSuffix}`)
                expect(domain.reseller_id).toEqual(1)
            })
            it('read non-existing domain', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/domains/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('as reseller', () => {
            let resellerDomainId: number
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
                        reseller_id: 1,
                        role: RbacRole.reseller,
                        show_passwords: true,
                        enable_2fa: false,
                    })
                expect(response.status).toEqual(201)
                resellerAdminId = +response.body.data[0].id
            })
            it('fail create domain with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `reseller.${domainSuffix}`, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('create domain without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `reseller.${domainSuffix}`})
                expect(response.status).toEqual(201)
                expect(response.body.data[0].reseller_id).toEqual(1)
                resellerDomainId = +response.body.data[0].id
                createdIds.push(resellerDomainId)
            })
            it('read domain created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/domains/${resellerDomainId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })
    })

    describe('Domain DELETE', () => {
        it('delete created domains', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/domains/${id}`)
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
            if (createdIds.length)
                await db.billing.Journal.delete({
                    resource_name: 'domains',
                    resource_id: In(createdIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
            if (resellerAdminId)
                await db.billing.Journal.delete({resource_name: 'admins', resource_id: resellerAdminId})
        })
    })
})
