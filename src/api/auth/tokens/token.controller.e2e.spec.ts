import {inspect} from 'util'

import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {AuthTokenCreateResponseDto} from './dto/token-create-response'
import {AuthTokenResponseDto} from './dto/token-response.dto'
import {AuthTokenModule} from './token.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {LoggerService} from '~/logger/logger.service'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type AuthTokenPost = {
    identifier: string
    expires_in: number
}

describe('Auth Token', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let compareSpy: jest.SpyInstance
    let authHeader: [string, string]
    let createdIds: string[] = []
    const secret = 'e2e-Secret-66545'
    const creds = {username: 'administrator', password: secret}
    const json: [string, string] = ['Content-Type', 'application/json']

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthTokenModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
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

    it('obtain auth token', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/jwt')
            .set(...json)
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            const token1: AuthTokenPost = {
                identifier: 'test_device_1',
                expires_in: 3600,
            }
            const token2: AuthTokenPost = {
                identifier: 'test_device_2',
                expires_in: 7200,
            }
            const tokenWithInvalidTtl: AuthTokenPost = {
                identifier: 'test_device_invalid_ttl',
                expires_in: 0,
            }

            it('create persistent auth token 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...authHeader)
                    .set(...json)
                    .send(token1)
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body[0]
                expect(created.identifier).toEqual(token1.identifier)
                expect(created.auth_token).toBeDefined()
                createdIds.push(created.id)
            })

            it('create persistent auth token 2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...authHeader)
                    .set(...json)
                    .send(token2)
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body[0]
                expect(created.identifier).toEqual(token2.identifier)
                expect(created.auth_token).toBeDefined()
                createdIds.push(created.id)
            })

            it('create auth token with credentials in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...json)
                    .send({...creds, identifier: 'test_device_json', expires_in: 600})
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body[0]
                expect(created.identifier).toEqual('test_device_json')
                expect(new Date(created.expires_at).getTime() - new Date(created.created_at).getTime()).toEqual(600 * 1000)
                expect(JSON.stringify(response.body)).not.toContain(secret)
                createdIds.push(created.id)
            })

            it('create auth token with basic auth', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .auth(creds.username, creds.password)
                    .set(...json)
                    .send({identifier: 'test_device_basic', expires_in: 900})
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body[0]
                expect(created.identifier).toEqual('test_device_basic')
                expect(new Date(created.expires_at).getTime() - new Date(created.created_at).getTime()).toEqual(900 * 1000)
                createdIds.push(created.id)
            })

            it('reject wrong password in the JSON body', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...json)
                    .send({...creds, identifier: 'test_device_json', expires_in: 600})
                expect(response.status).toEqual(401)
            })

            it('reject wrong password with basic auth', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .auth(creds.username, creds.password)
                    .set(...json)
                    .send({identifier: 'test_device_basic', expires_in: 600})
                expect(response.status).toEqual(401)
            })

            it('reset failed login attempts by a successful login', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/jwt')
                    .set(...json)
                    .send(creds)
                expect(response.status).toEqual(201)
            })

            it('reject credentials in the query string', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .query(creds)
                    .set(...json)
                    .send({identifier: 'test_device_query', expires_in: 600})
                expect(response.status).toEqual(401)
            })

            it('reject unknown property without echoing the password', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...json)
                    .send({...creds, identifier: 'test_device_json', expires_in: 600, foo: 'bar'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toContain('foo')
                expect(JSON.stringify(response.body)).not.toContain(secret)
            })

            it('do not log the password on validation errors', async () => {
                const debugSpy = jest.spyOn(LoggerService.prototype, 'debug')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/auth/tokens')
                        .set(...json)
                        .send({...creds, identifier: 'test_device_json', expires_in: 0})
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body)).not.toContain(secret)
                    expect(debugSpy).toHaveBeenCalledWith(expect.objectContaining({message: 'input validation failed'}))
                    expect(inspect(debugSpy.mock.calls, {depth: null})).not.toContain(secret)
                } finally {
                    debugSpy.mockRestore()
                }
            })

            it('validation fail for ttl outside allowed bounds', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...authHeader)
                    .set(...json)
                    .send(tokenWithInvalidTtl)
                expect(response.status).toEqual(422)
            })

            it('validation fail for missing identifier', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...authHeader)
                    .set(...json)
                    .send({expires_in: 3600})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created token 1 by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/auth/tokens/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const token: AuthTokenResponseDto = response.body
                expect(token.id).toEqual(createdIds[0])
                expect(token.identifier).toEqual('test_device_1')
            })

            it('read all tokens', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/tokens')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const tokens: AuthTokenResponseDto[] = response.body[0]
                const ids = tokens.map(token => token.id)
                expect(ids).toEqual(expect.arrayContaining(createdIds))
            })

            it('reject credentials in the JSON body on other routes', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/tokens')
                    .set(...json)
                    .send(creds)
                expect(response.status).toEqual(401)
            })

            it('reject credentials in the query string on other routes', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/tokens')
                    .query(creds)
                expect(response.status).toEqual(401)
            })

            it('read non-existing token', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/tokens/00000000-0000-0000-0000-000000000000')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Auth Token DELETE', () => {
        it('delete created tokens bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/auth/tokens/')
                .set(...authHeader)
                .set(...json)
                .send(createdIds)
            expect(result.status).toEqual(200)
        })

        it('deleted tokens are no longer readable', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .get(`/auth/tokens/${id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            }
        })
    })
})
