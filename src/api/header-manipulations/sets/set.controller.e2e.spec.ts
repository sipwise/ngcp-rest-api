import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {HeaderManipulationSetResponseDto} from './dto/set-response.dto'
import {HeaderManipulationSetModule} from './set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type RuleSetPost = {
    name: string
    reseller_id?: number
    description: string
}

describe('Rule Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: 'administrator', password: 'administrator'}
    const resellerCreds = {username: 'hm_set_reseller', password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HeaderManipulationSetModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe())
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
            const ruleset1: RuleSetPost = {
                name: 'test_ruleset1',
                reseller_id: 1,
                description: 'test_ruleset1 description',
            }
            const ruleset2: RuleSetPost = {
                name: 'test_ruleset2',
                reseller_id: 1,
                description: 'test_ruleset2 description',
            }
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send(ruleset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail duplicate rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(422)
            })
            it('validation fail rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created set 1 by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual('test_ruleset1')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created set 1 by name', async () => {
                const response = await request(app.getHttpServer())
                    .get('/header-manipulations/sets/?name=test_ruleset1')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: HeaderManipulationSetResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual('test_ruleset1')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created rule set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/header-manipulations/sets/?name=test_ruleset2')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: HeaderManipulationSetResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual('test_ruleset2')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset2 description')
            })
            it('read non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .get('/header-manipulations/sets/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ruleset3: RuleSetPost = {
                name: 'test ruleset3',
                reseller_id: 1,
                description: 'test ruleset3 description',
            }
            const ruleset4: RuleSetPost = {
                name: 'test_ruleset4',
                reseller_id: 1,
                description: 'test_ruleset4 description',
            }
            it('update rule set test_ruleset1 -> test ruleset3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send (ruleset3)
                expect(response.status).toEqual(200)
            })
            it('update rule set test_ruleset2 -> test_ruleset4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/header-manipulations/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .send(ruleset4)
                expect(response.status).toEqual(200)
            })
            it('read updated rule set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual('test ruleset3')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test ruleset3 description')
            })
            it('read updated rule set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual('test_ruleset4')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset4 description')
            })
            it('update non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .put('/header-manipulations/sets/999911111122')
                    .set(...authHeader)
                    .send (ruleset3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_ruleset5',
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_ruleset5 description',
                },
            ]
            it('adjust rule set 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated rule set 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual('test_ruleset5')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset5 description')
            })
            it('adjust non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/header-manipulations/sets/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule Set reseller_id as admin', () => {
        it('fail create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/header-manipulations/sets')
                .set(...authHeader)
                .send({
                    name: 'test_ruleset_no_reseller',
                    description: 'no reseller_id',
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
        })
        it('fail update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/header-manipulations/sets/${createdIds[0]}`)
                .set(...authHeader)
                .send({
                    name: 'test_ruleset_no_reseller',
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
                    .patch(`/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(emptyPatch)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            }
        })
        it('fail bulk adjust with empty reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch('/header-manipulations/sets')
                .set(...authHeader)
                .send({
                    [createdIds[0]]: [{op: 'replace', path: '/description', value: 'bulk'}],
                    [createdIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain(`[${createdIds[1]}] reseller_id should not be empty`)
        })
    })

    describe('Rule Set as reseller', () => {
        let resellerEntityId: number
        it('create reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .post('/admins')
                .set(...authHeader)
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
            resellerAdminId = +response.body[0].id
        })
        it('fail create with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/header-manipulations/sets')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    name: 'test_reseller_ruleset',
                    description: 'reseller',
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/header-manipulations/sets')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    name: 'test_reseller_ruleset',
                    description: 'reseller',
                })
            expect(response.status).toEqual(201)
            resellerEntityId = +response.body[0].id
            createdIds.push(resellerEntityId)
        })
        it('read created by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/header-manipulations/sets/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail update with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/header-manipulations/sets/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    name: 'renamed_test_reseller_ruleset',
                    description: 'reseller',
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/header-manipulations/sets/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    name: 'renamed_test_reseller_ruleset',
                    description: 'reseller',
                })
            expect(response.status).toEqual(200)
        })
        it('read updated by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/header-manipulations/sets/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail patch reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/header-manipulations/sets/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/reseller_id', value: 1}])
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('patch without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/header-manipulations/sets/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/description', value: 'patched reseller'}])
            expect(response.status).toEqual(200)
            expect(response.body.description).toEqual('patched reseller')
        })
        it('read patched by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/header-manipulations/sets/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('delete reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/admins/${resellerAdminId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
        })
    })

    describe('Rule Set DELETE', () => {
        it('delete created rule sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/header-manipulations/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})