import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {NCOSSetResponseDto} from './dto/ncos-set-response.dto'
import {NCOSSetModule} from './ncos-set.module'

import {NCOSSetLevelResponseDto} from '~/api/ncos-sets/dto/ncos-set-level-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type NcosSetPost = {
    name: string
    reseller_id: number
    description: string
}

describe('NCOS Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let createdSetLevelIds: number[] = []
    let createdLevelIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSSetModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []
        createdLevelIds = []
        createdSetLevelIds = []

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
            it('create ncos level', async () => {
                const ncosLevel = db.billing.NCOSLevel.create({
                    level: 'test_level1',
                    reseller_id: 1,
                    mode: NCOSLevelMode.Blacklist,
                })
                const res = await ncosLevel.save()
                createdLevelIds.push(ncosLevel.id)

                expect(res.level).toEqual('test_level1')
            })

            it('create ncos set level', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/ncos/sets/${createdIds[0]}/levels`)
                    .set(...authHeader)
                    .send({level_id: createdLevelIds[0]})
                expect(response.status).toEqual(201)
                createdSetLevelIds.push(+response.body[0].id)
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
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos set 1', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/sets/?name=test_ncosset1')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSSetResponseDto = response.body
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
                    .get('/ncos/sets/?name=test_ncosset2')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSSetResponseDto = response.body
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

        describe('NCOS Set Level', () => {
            it('read all levels for set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdIds[0]}/levels`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const [levels, count] = response.body
                expect(count).toEqual(1)
                expect(levels).toHaveLength(1)
                const level = levels[0]
                expect(level.set_id).toEqual(createdIds[0])
                expect(level.level_id).toEqual(createdLevelIds[0])
            })

            it('read specific level for set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdIds[0]}/levels/${createdSetLevelIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const level: NCOSSetLevelResponseDto = response.body
                expect(await validate(level)).toEqual([])
                expect(level.set_id).toEqual(createdIds[0])
                expect(level.level_id).toEqual(createdLevelIds[0])
            })
        })
    })

    describe('NCOSSet DELETE', () => {
        it('delete created ncos set level', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/ncos/sets/${createdIds[0]}/levels/${createdSetLevelIds[0]}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
        })

        it('delete created ncos sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/ncos/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })

        it('delete created ncos level', async () => {
            const result = await db.billing.NCOSLevel.delete({id: createdLevelIds[0]})
            expect(result.affected).toEqual(1)
        })
    })
})