import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {BanAdminModule} from './admin.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Ban Admins', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let mockAdminId: number
    let bannedAdminId: number
    const password = 'mockAdminPass'
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password}
    const startedAt = Date.now() / 1000
    const bannedLogin = `e2eBanAdmin${process.env.JEST_WORKER_ID}x${Date.now()}`
    // unique client ip per worker/run (X-Real-IP), 198.18.0.0/15 is reserved for benchmarking
    const bannedIp = `198.18.${process.env.JEST_WORKER_ID}.${Date.now() % 254 + 1}`
    // admins log in without a domain, the ban keys take req.hostname (supertest connects to 127.0.0.1)
    const keySuffix = `::user:${bannedLogin}::domain:127.0.0.1::realm:admin::ip:${bannedIp}`
    const failKey = `login:fail${keySuffix}`
    let banKey: string

    const requestAsBannedAdmin = (pass: string): request.Test =>
        request(app.getHttpServer())
            .get('/api/bans/admins')
            .auth(bannedLogin, pass)
            .set('X-Real-IP', bannedIp)
            .set('Accept', 'application/json')

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BanAdminModule, AppModule],
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
        const adminFlags = {
            reseller_id: 1,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: adminRole.id,
            is_system: false,
            is_ccare: false,
            lawful_intercept: false,
            is_active: true,
            read_only: false,
            can_reset_password: true,
            enable_2fa: false,
            show_otp_registration_info: false,
        }
        mockAdminId = (await db.billing.Admin.insert({
            ...adminFlags,
            login: creds.username,
            is_master: true,
            is_superuser: true,
            show_passwords: true,
            call_data: true,
            billing_data: true,
        })).identifiers[0].id
        bannedAdminId = (await db.billing.Admin.insert({
            ...adminFlags,
            login: bannedLogin,
            is_master: false,
            is_superuser: false,
            show_passwords: false,
            call_data: false,
            billing_data: false,
            ban_increment_stage: 0,
        })).identifiers[0].id
        banKey = `login:ban${keySuffix}::admin_id:${bannedAdminId}::reseller_id:1`
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
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async (pass: string) => pass === password)
        expect(await authService.compareBcryptPassword(password, 'hash')).toBe(true)
        expect(await authService.compareBcryptPassword('wrongPass', 'hash')).toBe(false)
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
        describe('ban by failed logins', () => {
            it('count failed login attempts', async () => {
                const redis = await authService.getRedisBanDb()
                for (let attempt = 1; attempt < AppService.config.security.login.max_attempts; attempt++) {
                    const response = await requestAsBannedAdmin('wrongPass')
                    expect(response.status).toEqual(401)
                    expect(await redis.hget(failKey, 'attempts')).toEqual(`${attempt}`)
                }
            })

            it('ban the admin at max_attempts failed logins', async () => {
                const response = await requestAsBannedAdmin('wrongPass')
                expect(response.status).toEqual(401)
                const redis = await authService.getRedisBanDb()
                expect(await redis.exists(failKey)).toEqual(0)
                expect(await redis.hget(banKey, 'banned_at')).toBeTruthy()
                const admin = await db.billing.Admin.findOneByOrFail({id: bannedAdminId})
                expect(admin.ban_increment_stage).toEqual(1)
                expect(admin.last_banned_ip).toEqual(bannedIp)
            })

            it('reject the banned admin with 403', async () => {
                const response = await requestAsBannedAdmin(password)
                expect(response.status).toEqual(403)
                expect(response.body.message).toEqual('Banned')
            })
        })

        describe('GET', () => {
            it('read banned admins filtered by username', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/bans/admins?username=${bannedLogin}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                expect(response.body.data).toEqual([{
                    id: bannedAdminId,
                    reseller_id: 1,
                    username: bannedLogin,
                    ban_increment_stage: 1,
                    last_banned_ip: bannedIp,
                    last_banned_at: expect.any(String),
                }])
            })

            it('read banned admin by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/bans/admins/${bannedAdminId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body).toEqual({
                    id: bannedAdminId,
                    reseller_id: 1,
                    username: bannedLogin,
                    ban_increment_stage: 1,
                    last_banned_ip: bannedIp,
                    last_banned_at: expect.any(String),
                })
            })

            it('read admin that is not banned returns 404', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/bans/admins/${mockAdminId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Ban Admins DELETE', () => {
        it('delete admin ban', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/api/bans/admins/${bannedAdminId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toEqual(204)
            expect(await (await authService.getRedisBanDb()).exists(banKey)).toEqual(0)
            expect((await db.billing.Admin.findOneByOrFail({id: bannedAdminId})).ban_increment_stage).toEqual(0)
        })

        it('allow the admin again after the ban is deleted', async () => {
            const response = await requestAsBannedAdmin(password)
            expect(response.status).toEqual(200)
        })

        it('delete fixtures and journals', async () => {
            const redis = await authService.getRedisBanDb()
            await redis.del(failKey)
            if (banKey)
                await redis.del(banKey)
            await db.billing.Journal.delete({
                resource_name: 'bans/admins',
                username: creds.username,
                timestamp: MoreThanOrEqual(startedAt),
            })
            await db.billing.Admin.delete({login: bannedLogin})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
