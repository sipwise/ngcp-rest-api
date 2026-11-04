import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {AdminModule} from '~/api/admins/admin.module'
import {AuthGrafanaModule} from '~/api/auth/grafana/grafana.module'
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

type AdminPost = {
    email: string
    reseller_id: number
    login: string
    is_master: boolean
    is_active: boolean
    read_only: boolean
    show_passwords: boolean
    call_data: boolean
    billing_data: boolean
    can_reset_password: boolean
    password: string
    role: RbacRole
    enable_2fa: boolean
}

describe('Auth Grafana', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdAdminIds: number[]
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const strongPassword = 'FFFooobarbaz123!!!'
    const userHeader = 'ngcp-grafana-user'
    const tokens: {[login: string]: [string, string]} = {}
    const run = Date.now().toString(36)
    const rwAdmin = `grafana_rw_admin_${run}`
    const roAdmin = `grafana_ro_admin_${run}`
    const resellerAdmin = `grafana_reseller_${run}`

    const admins: AdminPost[] = [
        {
            login: rwAdmin,
            email: `${rwAdmin}@example.com`,
            role: RbacRole.admin,
            read_only: false,
            reseller_id: 1,
            is_master: true,
            is_active: true,
            show_passwords: true,
            call_data: false,
            billing_data: true,
            can_reset_password: true,
            password: strongPassword,
            enable_2fa: false,
        },
        {
            login: roAdmin,
            email: `${roAdmin}@example.com`,
            role: RbacRole.admin,
            read_only: true,
            reseller_id: 1,
            is_master: true,
            is_active: true,
            show_passwords: true,
            call_data: false,
            billing_data: true,
            can_reset_password: true,
            password: strongPassword,
            enable_2fa: false,
        },
        {
            login: resellerAdmin,
            email: `${resellerAdmin}@example.com`,
            role: RbacRole.reseller,
            read_only: false,
            reseller_id: 1,
            is_master: true,
            is_active: true,
            show_passwords: true,
            call_data: false,
            billing_data: true,
            can_reset_password: true,
            password: strongPassword,
            enable_2fa: false,
        },
    ]

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthGrafanaModule, AdminModule, AppModule],
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

        createdAdminIds = []

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
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
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
        describe('Create initial admins', () => {
            it('should create admins', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(admins)
                expect(response.status).toEqual(201)
                for (const admin of response.body.data) {
                    createdAdminIds.push(+admin.id)
                }
                expect(createdAdminIds.length).toEqual(admins.length)
            })

            it('should obtain JWT for each admin, including read-only', async () => {
                for (const admin of admins) {
                    const response = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .auth(admin.login, strongPassword)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(201)
                    expect(response.body['access_token']).toBeDefined()
                    tokens[admin.login] = ['Authorization', 'Bearer ' + response.body['access_token']]
                }
            })
        })

        describe('POST', () => {
            it('returns username without edit', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual(rwAdmin)
                expect(response.headers[userHeader]).toEqual(rwAdmin)
            })

            it('returns admin with grafana_edit true', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({grafana_edit: true})
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('admin')
                expect(response.headers[userHeader]).toEqual('admin')
            })

            it('returns admin with NGCP-Grafana-Edit: 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                    .set('NGCP-Grafana-Edit', '1')
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('admin')
                expect(response.headers[userHeader]).toEqual('admin')
            })

            it('returns username with NGCP-Grafana-Edit: 0', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                    .set('NGCP-Grafana-Edit', '0')
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual(rwAdmin)
            })

            it('grafana_edit in body takes precedence over the header', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('NGCP-Grafana-Edit', '1')
                    .send({grafana_edit: false})
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual(rwAdmin)
            })

            it('fails with invalid grafana_edit', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({grafana_edit: 'yes'})
                expect(response.status).toEqual(422)
            })

            it('read-only admin gets username without edit', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[roAdmin])
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual(roAdmin)
                expect(response.headers[userHeader]).toEqual(roAdmin)
            })

            it('read-only admin is denied with grafana_edit true', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[roAdmin])
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({grafana_edit: true})
                expect(response.status).toEqual(403)
                expect(response.headers[userHeader]).toBeUndefined()
            })

            it('read-only admin is denied with NGCP-Grafana-Edit: 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[roAdmin])
                    .set('Accept', 'application/json')
                    .set('NGCP-Grafana-Edit', '1')
                expect(response.status).toEqual(403)
            })

            it('read-only admin is still denied on other write endpoints', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...tokens[roAdmin])
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send([])
                expect(response.status).toEqual(403)
            })

            it('reseller role is denied', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens[resellerAdmin])
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(403)
            })

            it('GET is not supported', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/grafana')
                    .set(...tokens[rwAdmin])
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Auth Grafana DELETE', () => {
        it('delete created admins bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send(createdAdminIds)
            expect(result.status).toEqual(204)
        })
        it('delete created journals', async () => {
            if (createdAdminIds.length)
                await db.billing.Journal.delete({resource_name: 'admins', resource_id: In(createdAdminIds)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
