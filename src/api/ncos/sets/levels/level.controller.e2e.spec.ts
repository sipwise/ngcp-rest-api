import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {NCOSSetLevelResponseDto} from './dto/level-response.dto'
import {NCOSSetLevelModule} from './level.module'

import {NCOSSetModule} from '~/api/ncos/sets/set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
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

    const ccareLogins = {
        [RbacRole.ccare]: `mockCcareUser${process.env.JEST_WORKER_ID}`,
        [RbacRole.ccareadmin]: `mockCcareadminUser${process.env.JEST_WORKER_ID}`,
    }
    let otherResellerContractId: number
    let otherResellerId: number

    const insertAdmin = async (login: string, role: RbacRole, resellerId: number): Promise<void> => {
        await db.billing.Admin.delete({login: login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role: role})
        await db.billing.Admin.insert({
            reseller_id: resellerId,
            login: login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
            is_superuser: role == RbacRole.ccareadmin,
            is_system: false,
            is_ccare: true,
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
    }

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

        describe('as ccare roles', () => {
            const headers: {[role: string]: [string, string]} = {}

            const get = (role: string, url: string): request.Test => request(app.getHttpServer())
                .get(url)
                .set(...headers[role])
                .set('Accept', 'application/json')

            it('create another reseller and log in as its ccare roles', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId,
                    name: `ncos_setlvl_ccare_reseller_${suffix}`,
                    status: ResellerStatus.Active,
                }).save()).id
                for (const [role, login] of Object.entries(ccareLogins)) {
                    await insertAdmin(login, role as RbacRole, otherResellerId)
                    const auth = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({username: login, password: 'mockAdminPass'})
                    expect(auth.status).toEqual(201)
                    headers[role] = ['Authorization', 'Bearer ' + auth.body['access_token']]
                }
            })

            it('create ncos set level of the other reseller', async () => {
                const set = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `ccare_ncossetlevel_set_${suffix}`, reseller_id: otherResellerId, description: 'ccare'})
                expect(set.status).toEqual(201)
                createdSetIds.push(+set.body.data[0].id)
                const level = await db.billing.NCOSLevel.create({
                    level: `ccare_level_${suffix}`,
                    reseller_id: otherResellerId,
                    mode: NCOSLevelMode.Blacklist,
                }).save()
                createdLevelIds.push(level.id)
                const response = await request(app.getHttpServer())
                    .post(`/api/ncos/sets/${createdSetIds[1]}/levels`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({level_id: level.id})
                expect(response.status).toEqual(201)
                createdSetLevelIds.push(+response.body.data[0].id)
            })

            it('list only own ncos set levels as ccare', async () => {
                const own = await get(RbacRole.ccare, `/api/ncos/sets/${createdSetIds[1]}/levels`)
                expect(own.status).toEqual(200)
                expect(own.body.data.map((l: NCOSSetLevelResponseDto) => +l.id)).toEqual([createdSetLevelIds[1]])
                const foreign = await get(RbacRole.ccare, `/api/ncos/sets/${createdSetIds[0]}/levels`)
                expect(foreign.status).toEqual(200)
                expect(foreign.body.total_count).toEqual(0)
            })

            it('list ncos set levels of all resellers as ccareadmin', async () => {
                for (const [i, setId] of createdSetIds.entries()) {
                    const response = await get(RbacRole.ccareadmin, `/api/ncos/sets/${setId}/levels`)
                    expect(response.status).toEqual(200)
                    expect(response.body.data.map((l: NCOSSetLevelResponseDto) => +l.id)).toEqual([createdSetLevelIds[i]])
                }
            })

            it.each([RbacRole.ccare, RbacRole.ccareadmin])('fail read ncos set level as %s', async role => {
                const response = await get(role, `/api/ncos/sets/${createdSetIds[1]}/levels/${createdSetLevelIds[1]}`)
                expect(response.status).toEqual(403)
            })
        })
    })

    describe('NCOS Set Level DELETE', () => {
        it('delete created ncos set levels', async () => {
            for (const id of createdSetLevelIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/ncos/sets/levels/${id}`)
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

        it('delete created ncos levels', async () => {
            if (createdLevelIds.length) {
                const result = await db.billing.NCOSLevel.delete({id: In(createdLevelIds)})
                expect(result.affected).toEqual(createdLevelIds.length)
            }
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete created fixtures', async () => {
            await db.billing.Admin.delete({login: In(Object.values(ccareLogins))})
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
