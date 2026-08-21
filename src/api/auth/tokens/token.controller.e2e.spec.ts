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
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type AuthTokenPost = {
    identifier: string
    expires_in: number
}

describe('Auth Token', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: string[] = []
    const creds = {username: 'administrator', password: 'administrator'}

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
            whitelist: false,
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
                    .send(token2)
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body[0]
                expect(created.identifier).toEqual(token2.identifier)
                expect(created.auth_token).toBeDefined()
                createdIds.push(created.id)
            })

            it('validation fail for ttl outside allowed bounds', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...authHeader)
                    .send(tokenWithInvalidTtl)
                expect(response.status).toEqual(422)
            })

            it('validation fail for missing identifier', async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/tokens')
                    .set(...authHeader)
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
