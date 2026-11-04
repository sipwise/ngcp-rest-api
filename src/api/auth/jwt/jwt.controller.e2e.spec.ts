import {inspect} from 'util'

import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {AuthJwtModule} from './jwt.module'

import {AuthTokenCreateResponseDto} from '~/api/auth/tokens/dto/token-create-response'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
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
    const creds = {username: 'administrator', password: secret}
    const json: [string, string] = ['Content-Type', 'application/json']

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

        app.useGlobalPipes(new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: true,
        }))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

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
        compareSpy = jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
        expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
    })

    describe('', () => { // main tests block
        describe('POST credentials', () => {
            it('login with credentials in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .set(...json)
                    .send(creds)
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
                expect(lifetime(response.body)).toEqual(appService.config.common.jwt_default_ttl)
                expect(JSON.stringify(response.body)).not.toContain(secret)
                accessToken = response.body.access_token
            })

            it('login with credentials and expires_in in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .set(...json)
                    .send({...creds, expires_in: 600})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(600)
            })

            it('login with basic auth', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .auth(creds.username, creds.password)
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
            })

            it('login with basic auth and expires_in', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set(...json)
                    .send({expires_in: 900})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(900)
            })

            it('reject wrong password in the JSON body', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .set(...json)
                    .send(creds)
                expect(response.status).toEqual(401)
            })

            it('reject wrong password with basic auth', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .auth(creds.username, creds.password)
                expect(response.status).toEqual(401)
            })

            it('reset failed login attempts by a successful login', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .set(...json)
                    .send(creds)
                expect(response.status).toEqual(201)
            })

            it('reject credentials in the query string without logging the password', async () => {
                const logSpy = jest.spyOn(LoggerService.prototype, 'log')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/auth/jwt')
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
                    .post('/auth/jwt')
                    .set(...json)
                    .send({...creds, foo: 'bar'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toContain('foo')
                expect(JSON.stringify(response.body)).not.toContain(secret)
            })

            it('do not log the password on validation errors', async () => {
                const debugSpy = jest.spyOn(LoggerService.prototype, 'debug')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/auth/jwt')
                        .set(...json)
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
                    .post('/auth/jwt')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set(...json)
                    .send({expires_in: 300})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(300)
            })

            it('create an auth token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set(...json)
                    .send({identifier: 'test_jwt_exchange', expires_in: 3600})
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body[0]
                authTokenId = created.id
                authToken = created.auth_token
            })

            it('exchange an auth token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .set('Authorization', `Bearer ${authToken}`)
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
                .delete(`/auth/tokens/${authTokenId}`)
                .set('Authorization', `Bearer ${accessToken}`)
            expect(response.status).toEqual(200)
        })
    })
})
