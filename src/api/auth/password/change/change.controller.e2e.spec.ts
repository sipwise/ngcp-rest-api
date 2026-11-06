import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {AuthPasswordChangeModule} from './change.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db, internal} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let fixtureAdminId: number
    const startedAt = Date.now() / 1000
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const fixture = {
        username: `pwchange${process.env.JEST_WORKER_ID}x${Date.now()}`,
        password: 'OldPass#Abc123$Xyz!q',
        newPassword: 'NewPass#Def456$Uvw!r',
    }
    const basicAuth = (username: string, password: string): [string, string] =>
        ['Authorization', 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')]

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthPasswordChangeModule, AppModule],
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

        const adminRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.admin})
        const adminFlags = {
            reseller_id: 1,
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
        }

        await db.billing.Admin.delete({login: creds.username})
        await db.billing.Admin.insert({
            ...adminFlags,
            login: creds.username,
            saltedpass: 'mockAdminSaltedpass',
        })

        const fixtureInternal = new internal.Admin()
        fixtureInternal.password = fixture.password
        const result = await db.billing.Admin.insert({
            ...adminFlags,
            login: fixture.username,
            saltedpass: await fixtureInternal.generateSaltedpass(),
        })
        fixtureAdminId = result.identifiers[0].id
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
        const realCompare: (pass: string, saltedpass: string) => Promise<boolean> =
            authService.compareBcryptPassword.bind(authService)
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(
            async (pass: string, saltedpass: string) => saltedpass === 'mockAdminSaltedpass' || realCompare(pass, saltedpass),
        )
        expect(await authService.compareBcryptPassword('123', 'mockAdminSaltedpass')).toBe(true)
    })

    it('obtain auth token', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            it('log in with the fixture admin password', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set(...basicAuth(fixture.username, fixture.password))
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
            })

            it('change the password', async () => {
                const before = await db.billing.Admin.findOneByOrFail({id: fixtureAdminId})
                const response = await request(app.getHttpServer())
                    .post('/api/auth/password/change')
                    .set(...basicAuth(fixture.username, fixture.password))
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({new_password: fixture.newPassword})
                expect(response.status).toEqual(201)

                const after = await db.billing.Admin.findOneByOrFail({id: fixtureAdminId})
                expect(after.saltedpass).not.toEqual(before.saltedpass)
                expect(after.saltedpass_modify_timestamp.getTime())
                    .toBeGreaterThanOrEqual(before.saltedpass_modify_timestamp.getTime())
                expect(await authService.compareBcryptPassword(fixture.password, after.saltedpass)).toBe(false)
                expect(await authService.compareBcryptPassword(fixture.newPassword, after.saltedpass)).toBe(true)
                expect(await db.billing.AdminPasswordJournal.countBy({admin_id: fixtureAdminId})).toEqual(1)
            })

            it('log in with the new password', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set(...basicAuth(fixture.username, fixture.newPassword))
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.username).toEqual(fixture.username)
            })

            it('reject a weak password with 422', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/password/change')
                    .set(...basicAuth(fixture.username, fixture.newPassword))
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({new_password: 'weak'})
                expect(response.status).toEqual(422)
            })
        })
    })

    describe('Auth Password Change DELETE', () => {
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: fixture.username, timestamp: MoreThanOrEqual(startedAt)})
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete fixture admin', async () => {
            if (fixtureAdminId) {
                await db.billing.AdminPasswordJournal.delete({admin_id: fixtureAdminId})
                await db.billing.Admin.delete(fixtureAdminId)
            }
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
