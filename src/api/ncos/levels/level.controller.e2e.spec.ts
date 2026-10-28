import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {NCOSLevelResponseDto} from './dto/level-response.dto'
import {NCOSLevelModule} from './level.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type NCOSLevelPost = {
    reseller_id?: number
    level: string
    mode: string
    local_ac: boolean
    intra_pbx: boolean
    time_set_invert: boolean
    description: string
    time_set_id?: number | null
    expose_to_customer: boolean
}

describe('NCOS Level', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: 'administrator', password: 'administrator'}
    const resellerCreds = {username: 'ncos_lvl_reseller', password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSLevelModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

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
            const ncosLevel1: NCOSLevelPost = {
                reseller_id: 1,
                description: 'test_ncosLevel1 description',
                level: 'test_ncosLevel1',
                mode: 'blacklist',
                local_ac: false,
                intra_pbx: false,
                expose_to_customer: false,
                time_set_invert: false,
            }
            const ncosLevel2: NCOSLevelPost = {
                reseller_id: 1,
                description: 'test_ncosLevel2 description',
                level: 'test_ncosLevel2',
                mode: 'blacklist',
                local_ac: false,
                intra_pbx: false,
                expose_to_customer: false,
                time_set_invert: false,
            }
            it('create ncos level test_ncosLevel1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/levels/')
                    .set(...authHeader)
                    .send(ncosLevel1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create ncos level test_ncosLevel2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/levels/')
                    .set(...authHeader)
                    .send(ncosLevel2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail duplicate ncos level', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/levels/')
                    .set(...authHeader)
                    .send(ncosLevel1)
                expect(response.status).toEqual(422)
            })
            it('validation fail ncos level', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/levels/')
                    .set(...authHeader)
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos level 1', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/levels?level=test_ncosLevel1')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSLevelResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosLevel = setEntries[0]
                expect(ncosLevel.level).toEqual('test_ncosLevel1')
                expect(ncosLevel.reseller_id).toEqual(1)
                expect(ncosLevel.description).toEqual('test_ncosLevel1 description')
            })
            it('read created ncos level 2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/levels/?level=test_ncosLevel2')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSLevelResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosLevel = setEntries[0]
                expect(ncosLevel.level).toEqual('test_ncosLevel2')
                expect(ncosLevel.reseller_id).toEqual(1)
                expect(ncosLevel.description).toEqual('test_ncosLevel2 description')
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/levels/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ncosLevel3: NCOSLevelPost = {
                level: 'test_ncosLevel3',
                reseller_id: 1,
                description: 'test_ncosLevel3 description',
                mode: 'blacklist',
                local_ac: false,
                intra_pbx: false,
                expose_to_customer: false,
                time_set_invert: false,
            }
            it('update ncos level test_ncosLevel1 -> test_ncosLevel3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/ncos/levels/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(ncosLevel3)
                expect(response.status).toEqual(200)
            })
            it('read updated ncos level 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/levels/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosLevel: NCOSLevelResponseDto = response.body
                expect(ncosLevel.level).toEqual('test_ncosLevel3')
            })
            it('update non-existing ncos level', async () => {
                const response = await request(app.getHttpServer())
                    .put('/ncos/levels/999911111122')
                    .set(...authHeader)
                    .send(ncosLevel3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/level',
                    value: 'test_ncosLevel5',
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_ncosLevel5 description',
                },
            ]
            it('adjust ncos level 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/ncos/levels/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated ncos level 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/levels/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosLevel: NCOSLevelResponseDto = response.body
                expect(ncosLevel.level).toEqual('test_ncosLevel5')
                expect(ncosLevel.reseller_id).toEqual(1)
                expect(ncosLevel.description).toEqual('test_ncosLevel5 description')
            })
            it('adjust non-existing ncos level', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/ncos/levels/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('NCOS Level reseller_id as admin', () => {
        it('fail create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/ncos/levels')
                .set(...authHeader)
                .send({
                    level: 'test_ncosLevel_no_reseller',
                    description: 'no reseller_id',
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
        })
        it('fail update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/ncos/levels/${createdIds[0]}`)
                .set(...authHeader)
                .send({
                    level: 'test_ncosLevel_no_reseller',
                    description: 'no reseller_id',
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
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
                    .patch(`/ncos/levels/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(emptyPatch)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            }
        })
        it('fail bulk adjust with empty reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch('/ncos/levels')
                .set(...authHeader)
                .send({
                    [createdIds[0]]: [{op: 'replace', path: '/description', value: 'bulk'}],
                    [createdIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain(`[${createdIds[1]}] reseller_id should not be empty`)
        })
    })

    describe('NCOS Level as reseller', () => {
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
                .post('/ncos/levels')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    level: 'test_reseller_ncosLevel',
                    description: 'reseller',
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/ncos/levels')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    level: 'test_reseller_ncosLevel',
                    description: 'reseller',
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
                })
            expect(response.status).toEqual(201)
            resellerEntityId = +response.body[0].id
            createdIds.push(resellerEntityId)
        })
        it('read created by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/ncos/levels/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail update with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/ncos/levels/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    level: 'renamed_test_reseller_ncosLevel',
                    description: 'reseller',
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/ncos/levels/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    level: 'renamed_test_reseller_ncosLevel',
                    description: 'reseller',
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
                })
            expect(response.status).toEqual(200)
        })
        it('read updated by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/ncos/levels/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail patch reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/ncos/levels/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/reseller_id', value: 1}])
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('patch without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/ncos/levels/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/description', value: 'patched reseller'}])
            expect(response.status).toEqual(200)
            expect(response.body.description).toEqual('patched reseller')
        })
        it('read patched by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/ncos/levels/${resellerEntityId}`)
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

    describe('NCOSLevel DELETE', () => {
        it('delete created ncos levels', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/ncos/levels/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})