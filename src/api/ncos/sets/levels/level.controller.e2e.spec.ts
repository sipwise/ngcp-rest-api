import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {NCOSSetLevelResponseDto} from './dto/level-response.dto'
import {NCOSSetLevelModule} from './level.module'

import {NCOSSetModule} from '~/api/ncos/sets/set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type NcosSetPost = {
    name: string
    reseller_id: number
    description: string
}

describe('NCOS Set Level', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdSetIds: number[] = []
    let createdSetLevelIds: number[] = []
    let createdLevelIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSSetLevelModule, NCOSSetModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdSetIds = []
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
        it('create ncos set for level tests', async () => {
            const ncosset: NcosSetPost = {
                name: 'test_ncossetlevel_set',
                reseller_id: 1,
                description: 'test_ncossetlevel_set description',
            }
            const response = await request(app.getHttpServer())
                .post('/ncos/sets')
                .set(...authHeader)
                .send(ncosset)
            expect(response.status).toEqual(201)
            createdSetIds.push(+response.body[0].id)
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

        describe('POST', () => {
            it('create ncos set level', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/ncos/sets/${createdSetIds[0]}/levels`)
                    .set(...authHeader)
                    .send({level_id: createdLevelIds[0]})
                expect(response.status).toEqual(201)
                createdSetLevelIds.push(+response.body[0].id)
            })
        })

        describe('GET', () => {
            it('read all levels for set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdSetIds[0]}/levels`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const [levels, count] = response.body
                expect(count).toEqual(1)
                expect(levels).toHaveLength(1)
                const level = levels[0]
                expect(level.set_id).toEqual(createdSetIds[0])
                expect(level.level_id).toEqual(createdLevelIds[0])
            })

            it('read specific level for set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/ncos/sets/${createdSetIds[0]}/levels/${createdSetLevelIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const level: NCOSSetLevelResponseDto = response.body
                expect(await validate(level)).toEqual([])
                expect(level.set_id).toEqual(createdSetIds[0])
                expect(level.level_id).toEqual(createdLevelIds[0])
            })
        })
    })

    describe('NCOS Set Level DELETE', () => {
        it('delete created ncos set level', async () => {
            if (createdSetLevelIds.length) {
                const response = await request(app.getHttpServer())
                    .delete(`/ncos/sets/${createdSetIds[0]}/levels/${createdSetLevelIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            }
        })

        it('delete created ncos set', async () => {
            for (const id of createdSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/ncos/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })

        it('delete created ncos level', async () => {
            if (createdLevelIds.length) {
                const result = await db.billing.NCOSLevel.delete({id: createdLevelIds[0]})
                expect(result.affected).toEqual(1)
            }
        })
    })
})
