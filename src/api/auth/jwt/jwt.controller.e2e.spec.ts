import {inspect} from 'util'

import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'

import {AuthJwtModule} from './jwt.module'

import {AuthTokenCreateResponseDto} from '~/api/auth/tokens/dto/token-create-response'
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
import {LoggerService} from '~/logger/logger.service'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Auth JWT', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let compareSpy: jest.SpyInstance
    let accessToken: string
    let authTokenId: string
    let authToken: string
    const secret = 'e2e-Secret-66545'
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: secret}

    const lifetime = (body: {created_at: string, expires_at: string}): number =>
        (new Date(body.expires_at).getTime() - new Date(body.created_at).getTime()) / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthJwtModule, AppModule],
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
        compareSpy = jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
        expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
    })

    describe('', () => { // main tests block
        describe('POST credentials', () => {
            it('login with credentials in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(creds)
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
                expect(lifetime(response.body)).toEqual(appService.config.common.jwt_default_ttl)
                expect(JSON.stringify(response.body)).not.toContain(secret)
                accessToken = response.body.access_token
            })

            it('login with credentials and expires_in in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...creds, expires_in: 600})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(600)
            })

            it('login with basic auth', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
            })

            it('login with basic auth and expires_in', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({expires_in: 900})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(900)
            })

            it('reject wrong password in the JSON body', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(creds)
                expect(response.status).toEqual(401)
            })

            it('reject wrong password with basic auth', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })

            it('reset failed login attempts by a successful login', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(creds)
                expect(response.status).toEqual(201)
            })

            it('reject credentials in the query string without logging the password', async () => {
                const logSpy = jest.spyOn(LoggerService.prototype, 'log')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .query(creds)
                    expect(response.status).toEqual(401)
                    expect(response.body.path).toContain('password=********')
                    expect(JSON.stringify(response.body)).not.toContain(secret)
                    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({message: 'RESPONSE'}))
                    expect(inspect(logSpy.mock.calls, {depth: null})).not.toContain(secret)
                } finally {
                    logSpy.mockRestore()
                }
            })

            it('reject unknown property without echoing the password', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...creds, foo: 'bar'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toContain('foo')
                expect(JSON.stringify(response.body)).not.toContain(secret)
            })

            it('do not log the password on validation errors', async () => {
                const debugSpy = jest.spyOn(LoggerService.prototype, 'debug')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({...creds, expires_in: 0})
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body)).not.toContain(secret)
                    expect(debugSpy).toHaveBeenCalledWith(expect.objectContaining({message: 'input validation failed'}))
                    expect(inspect(debugSpy.mock.calls, {depth: null})).not.toContain(secret)
                } finally {
                    debugSpy.mockRestore()
                }
            })
        })

        describe('POST bearer', () => {
            it('renew with an access token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({expires_in: 300})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(300)
            })

            it('create an auth token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/tokens')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({identifier: 'test_jwt_exchange', expires_in: 3600})
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body.data[0]
                authTokenId = created.id
                authToken = created.auth_token
            })

            it('exchange an auth token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
            })
        })
    })

    describe('Auth JWT DELETE', () => {
        it('delete the auth token', async () => {
            if (!authTokenId)
                return
            const response = await request(app.getHttpServer())
                .delete(`/api/auth/tokens/${authTokenId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('Accept', 'application/json')
            expect(response.status).toEqual(204)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
