import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {NCOSPatternResponseDto} from './dto/pattern-response.dto'
import {NCOSPatternModule} from './pattern.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type NCOSPatternPost = {
    ncos_level_id: number
    pattern: string
    description?: string
}

describe('NCOS Pattern', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    const createdLevelIds: number[] = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSPatternModule, AppModule],
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
            const ncosPattern1: NCOSPatternPost = {
                ncos_level_id: 1,
                pattern: 'test_ncosPattern1',
                description: 'test_ncosPattern1 description',
            }
            const ncosPattern2: NCOSPatternPost = {
                ncos_level_id: 1,
                pattern: 'test_ncosPattern2',
                description: 'test_ncosPattern2 description',
            }
            it('create level', async () => {
                const level = await db.billing.NCOSLevel.create({
                    reseller_id: 1,
                    level: `e2e_pattern_${Date.now().toString(36)}`,
                }).save()
                createdLevelIds.push(level.id)
                ncosPattern1.ncos_level_id = level.id
                ncosPattern2.ncos_level_id = level.id
            })
            it('create ncos pattern test_ncosPattern1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/patterns/')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosPattern1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create ncos pattern test_ncosPattern2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/patterns/')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosPattern2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail duplicate ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/patterns/')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosPattern1)
                expect(response.status).toEqual(422)
            })
            it('validation fail ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/patterns/')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos pattern 1', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/patterns?pattern=test_ncosPattern1')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: NCOSPatternResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosPattern = setEntries[0]
                expect(ncosPattern.pattern).toEqual('test_ncosPattern1')
            })
            it('read created ncos pattern 2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/patterns/?pattern=test_ncosPattern2')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: NCOSPatternResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosPattern = setEntries[0]
                expect(ncosPattern.pattern).toEqual('test_ncosPattern2')
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/patterns/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ncosPattern3: NCOSPatternPost = {
                pattern: 'test_ncosPattern3',
                description: 'test_ncosPattern3 description',
                ncos_level_id: createdLevelIds[0],
            }
            it('update ncos pattern test_ncosPattern1 -> test_ncosPattern3', async () => {
                ncosPattern3.ncos_level_id = createdLevelIds[0]
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/patterns/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosPattern3)
                expect(response.status).toEqual(204)
            })
            it('read updated ncos pattern 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/patterns/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosPattern: NCOSPatternResponseDto = response.body
                expect(ncosPattern.pattern).toEqual('test_ncosPattern3')
            })
            it('update non-existing ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/ncos/patterns/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosPattern3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/pattern',
                    value: 'test_ncospattern4',
                },
            ]
            it('adjust ncos pattern 3 -> 4', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/patterns/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated ncos pattern 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/patterns/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosPattern: NCOSPatternResponseDto = response.body
                expect(ncosPattern.pattern).toEqual('test_ncospattern4')
            })
            it('adjust non-existing ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/ncos/patterns/999991111112')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('NCOS pattern DELETE', () => {
        it('delete created ncos patterns', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/ncos/patterns/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete ncos level', async () => {
            if (createdLevelIds.length)
                await db.billing.NCOSLevel.delete(createdLevelIds)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})