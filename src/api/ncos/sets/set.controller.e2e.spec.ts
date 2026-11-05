import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {NCOSSetResponseDto} from './dto/set-response.dto'
import {NCOSSetModule} from './set.module'

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

type NcosSetPost = {
    name: string
    reseller_id?: number
    description: string
}

describe('NCOS Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const resellerCreds = {username: `ncos_set_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSSetModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

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
            const ncosset1: NcosSetPost = {
                name: 'test_ncosset1',
                reseller_id: 1,
                description: 'test_ncosset1 description',
            }
            const ncosset2: NcosSetPost = {
                name: 'test_ncosset2',
                reseller_id: 1,
                description: 'test_ncosset2 description',
            }
            it('create ncos set test_ncosset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create ncos set test_ncosset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail duplicate ncos set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset1)
                expect(response.status).toEqual(422)
            })
            it('validation fail ncos set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos set 1', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/sets/?name=test_ncosset1')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: NCOSSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosset = setEntries[0]
                expect(ncosset.name).toEqual('test_ncosset1')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset1 description')
            })
            it('read created ncos set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/sets/?name=test_ncosset2')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: NCOSSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosset = setEntries[0]
                expect(ncosset.name).toEqual('test_ncosset2')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset2 description')
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ncosset3: NcosSetPost = {
                name: 'test_ncosset3',
                reseller_id: 1,
                description: 'test_ncosset3 description',
            }
            const ncosset4: NcosSetPost = {
                name: 'test_ncosset4',
                reseller_id: 1,
                description: 'test_ncosset4 description',
            }
            it('update ncos set test_ncosset1 -> test_ncosset3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset3)
                expect(response.status).toEqual(204)
            })
            it('update ncos set test_ncosset2 -> test_ncosset4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset4)
                expect(response.status).toEqual(204)
            })
            it('read updated ncos set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual('test_ncosset3')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset3 description')
            })
            it('read updated ncos set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual('test_ncosset4')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset4 description')
            })
            it('update non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/ncos/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_ncosset5',
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_ncosset5 description',
                },
            ]
            it('adjust ncos set 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated ncos set 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual('test_ncosset5')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset5 description')
            })
            it('adjust non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/ncos/sets/999991111112')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })

        describe('reseller_id as admin', () => {
            it('fail create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: 'test_ncosset_no_reseller',
                        description: 'no reseller_id',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            })
            it('fail update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: 'test_ncosset_no_reseller',
                        description: 'no reseller_id',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            })
            it('fail adjust with empty reseller_id', async () => {
                const tt: PatchOperation[][] = [
                    [{op: 'replace', path: '/reseller_id', value: null}],
                    [{op: 'remove', path: '/reseller_id'}],
                ]
                for (const emptyPatch of tt) {
                    const response = await request(app.getHttpServer())
                        .patch(`/api/ncos/sets/${createdIds[0]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
                }
            })
            it('fail bulk adjust with empty reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/description', value: 'bulk'}],
                        [createdIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain(`[${createdIds[1]}] reseller_id should not be empty`)
            })
        })

        describe('as reseller', () => {
            let resellerEntityId: number
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
            it('fail create with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        name: 'test_reseller_ncosset',
                        description: 'reseller',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: 'test_reseller_ncosset',
                        description: 'reseller',
                    })
                expect(response.status).toEqual(201)
                resellerEntityId = +response.body.data[0].id
                createdIds.push(resellerEntityId)
            })
            it('read created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail update with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        name: 'renamed_test_reseller_ncosset',
                        description: 'reseller',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: 'renamed_test_reseller_ncosset',
                        description: 'reseller',
                    })
                expect(response.status).toEqual(204)
            })
            it('read updated by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail patch reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/reseller_id', value: 1}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('patch without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/description', value: 'patched reseller'}])
                expect(response.status).toEqual(200)
                expect(response.body.description).toEqual('patched reseller')
            })
            it('read patched by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })
    })

    describe('NCOSSet DELETE', () => {
        it('delete created ncos sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/ncos/sets/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
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
            await db.billing.Journal.delete({username: In([creds.username, resellerCreds.username]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
