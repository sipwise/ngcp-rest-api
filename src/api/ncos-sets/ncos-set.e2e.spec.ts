import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {AppModule} from '../../app.module'
import {AppService} from '../../app.service'
import {AuthService} from '../../auth/auth.service'
import {NCOSSetModule} from './ncos-set.module'
import {NCOSSetResponseDto} from './dto/ncos-set-response.dto'
import {NCOSSetLevelResponseDto} from './dto/ncos-set-level-response.dto'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {HttpExceptionFilter} from '../../helpers/http-exception.filter'
import {ValidateInputPipe} from '../../pipes/validate.pipe'
import {validate} from 'class-validator'

describe('NCOS Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSSetModule, AppModule],
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
            let ncosset1: any = {
                name: 'test_ncosset1',
                reseller_id: 1,
                description: 'test_ncosset1 description'
            }
            let ncosset2: any = {
                name: 'test_ncosset2',
                reseller_id: 1,
                description: 'test_ncosset2 description'
            }
            it('create ncos set test_ncosset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/sets')
                    .set(...authHeader)
                    .send(ncosset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create ncos set test_ncosset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/sets')
                    .set(...authHeader)
                    .send(ncosset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail duplicate ncos set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/sets')
                    .set(...authHeader)
                    .send(ncosset1)
                expect(response.status).toEqual(422)
            })
            it('validation fail ncos set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/sets')
                    .set(...authHeader)
                    .send({ unknownField: 'test' })
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos set 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/?name=test_ncosset1`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSSetLevelResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosset = setEntries[0]
                expect(ncosset.name).toEqual('test_ncosset1')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset1 description')
            })
            it('read created ncos set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/?name=test_ncosset2`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSSetLevelResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosset = setEntries[0]
                expect(ncosset.name).toEqual('test_ncosset2')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset2 description')
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/sets/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            let ncosset3: any = {
                name: 'test_ncosset3',
                reseller_id: 1,
                description: 'test_ncosset3 description'
            }
            let ncosset4: any = {
                name: 'test_ncosset4',
                reseller_id: 1,
                description: 'test_ncosset4 description'
            }
            it('update ncos set test_ncosset1 -> test_ncosset3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(ncosset3)
                expect(response.status).toEqual(200)
            })
            it('update ncos set test_ncosset2 -> test_ncosset4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/ncos/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .send(ncosset4)
                expect(response.status).toEqual(200)
            })
            it('read updated ncos set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual('test_ncosset3')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset3 description')
            })
            it('read updated ncos set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual('test_ncosset4')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset4 description')
            })
            it('update non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put('/ncos/sets/999911111122')
                    .set(...authHeader)
                    .send(ncosset3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: "replace",
                    path: "/name",
                    value: 'test_ncosset5',
                },
                {
                    op: "replace",
                    path: "/description",
                    value: 'test_ncosset5 description',
                }
            ]
            it('adjust ncos set 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated ncos set 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual('test_ncosset5')
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset5 description')
            })
            it('adjust non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/ncos/sets/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('NCOSSet DELETE', () => {
        it('delete created ncos sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/ncos/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})