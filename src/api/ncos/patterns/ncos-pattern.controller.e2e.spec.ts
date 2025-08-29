import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {NCOSPatternResponseDto} from './dto/ncos-pattern-response.dto'
import {NCOSPatternModule} from './ncos-pattern.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
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
    let createdIds: number[] = []
    const createdLevelIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSPatternModule, AppModule],
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
                const level = await db.billing.NCOSLevel.create({}).save()
                createdLevelIds.push(level.id)
                ncosPattern1.ncos_level_id = level.id
                ncosPattern2.ncos_level_id = level.id
            })
            it('create ncos pattern test_ncosPattern1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/patterns/')
                    .set(...authHeader)
                    .send(ncosPattern1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create ncos pattern test_ncosPattern2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/patterns/')
                    .set(...authHeader)
                    .send(ncosPattern2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail duplicate ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/patterns/')
                    .set(...authHeader)
                    .send(ncosPattern1)
                expect(response.status).toEqual(422)
            })
            it('validation fail ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .post('/ncos/patterns/')
                    .set(...authHeader)
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos pattern 1', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/patterns?pattern=test_ncosPattern1')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSPatternResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosPattern = setEntries[0]
                expect(ncosPattern.pattern).toEqual('test_ncosPattern1')
            })
            it('read created ncos pattern 2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/patterns/?pattern=test_ncosPattern2')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: NCOSPatternResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosPattern = setEntries[0]
                expect(ncosPattern.pattern).toEqual('test_ncosPattern2')
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/ncos/patterns/999911111122')
                    .set(...authHeader)
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
                const response = await request(app.getHttpServer())
                    .put(`/ncos/patterns/')/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(ncosPattern3)
                expect(response.status).toEqual(200)
            })
            it('read updated ncos pattern 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/patterns/')/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosPattern: NCOSPatternResponseDto = response.body
                expect(ncosPattern.pattern).toEqual('test_ncosPattern3')
            })
            it('update non-existing ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .put('/ncos/patterns/999911111122')
                    .set(...authHeader)
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
                    .patch(`/ncos/patterns/')/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated ncos pattern 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/patterns/')/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ncosPattern: NCOSPatternResponseDto = response.body
                expect(ncosPattern.pattern).toEqual('test_ncospattern4')
            })
            it('adjust non-existing ncos pattern', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/ncos/patterns/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('NCOS pattern DELETE', () => {
        it('delete created ncos patterns', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/ncos/patterns/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
        it ('delete ncos level', async () => {
            await db.billing.NCOSLevel.delete(createdLevelIds)
        })
    })
})