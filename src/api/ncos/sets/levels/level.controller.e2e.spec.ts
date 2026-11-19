import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {NCOSSetLevelResponseDto} from './dto/level-response.dto'
import {NCOSSetLevelModule} from './level.module'

import {NCOSSetModule} from '~/api/ncos/sets/set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'
import {validate} from '~/helpers/validate.helper'

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
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const suffix = `${process.env.JEST_WORKER_ID}${Date.now()}`

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

        app.setGlobalPrefix('api')
        setupApp(app)

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
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(() => Promise.resolve(true))
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
        it('create ncos set for level tests', async () => {
            const ncosset: NcosSetPost = {
                name: `test_ncossetlevel_set_${suffix}`,
                reseller_id: 1,
                description: 'test_ncossetlevel_set description',
            }
            const response = await request(app.getHttpServer())
                .post('/api/ncos/sets')
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send(ncosset)
            expect(response.status).toEqual(201)
            createdSetIds.push(+response.body.data[0].id)
        })

        it('create ncos level', async () => {
            const ncosLevel = db.billing.NCOSLevel.create({
                level: `test_level1_${suffix}`,
                reseller_id: 1,
                mode: NCOSLevelMode.Blacklist,
            })
            const res = await ncosLevel.save()
            createdLevelIds.push(ncosLevel.id)

            expect(res.level).toEqual(`test_level1_${suffix}`)
        })

        describe('POST', () => {
            it('create ncos set level', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/ncos/sets/${createdSetIds[0]}/levels`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({level_id: createdLevelIds[0]})
                expect(response.status).toEqual(201)
                createdSetLevelIds.push(+response.body.data[0].id)
            })
        })

        describe('GET', () => {
            it('read all levels for set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdSetIds[0]}/levels`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const {data: levels, total_count: count} = response.body
                expect(count).toEqual(1)
                expect(levels).toHaveLength(1)
                const level = levels[0]
                expect(level.set_id).toEqual(createdSetIds[0])
                expect(level.level_id).toEqual(createdLevelIds[0])
            })

            it('read specific level for set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdSetIds[0]}/levels/${createdSetLevelIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
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
                    .delete(`/api/ncos/sets/${createdSetIds[0]}/levels/${createdSetLevelIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(204)
            }
        })

        it('delete created ncos set', async () => {
            for (const id of createdSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/ncos/sets/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })

        it('delete created ncos level', async () => {
            if (createdLevelIds.length) {
                const result = await db.billing.NCOSLevel.delete({id: createdLevelIds[0]})
                expect(result.affected).toEqual(1)
            }
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
