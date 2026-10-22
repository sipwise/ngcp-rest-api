import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {AdminModule} from '~/api/admins/admin.module'
import {AuthGrafanaModule} from '~/api/auth/grafana/grafana.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
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
}

describe('Auth Grafana', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdAdminIds: number[]
    const creds = {username: 'administrator', password: 'administrator'}
    const preferHeader: [string, string] = ['prefer', 'return=representation']
    const strongPassword = 'FFFooobarbaz123!!!'
    const userHeader = 'ngcp-grafana-user'
    const tokens: {[login: string]: [string, string]} = {}

    const admins: AdminPost[] = [
        {
            login: 'grafana_rw_admin',
            email: 'grafana_rw_admin@example.com',
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
        },
        {
            login: 'grafana_ro_admin',
            email: 'grafana_ro_admin@example.com',
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
        },
        {
            login: 'grafana_reseller',
            email: 'grafana_reseller@example.com',
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

        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())
        app.setGlobalPrefix('api')

        createdAdminIds = []

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
            .post('/api/auth/jwt')
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
                    .set(...preferHeader)
                    .send(admins)
                expect(response.status).toEqual(201)
                for (const admin of response.body) {
                    createdAdminIds.push(+admin.id)
                }
                expect(createdAdminIds.length).toEqual(admins.length)
            })

            it('should obtain JWT for each admin, including read-only', async () => {
                for (const admin of admins) {
                    const response = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .auth(admin.login, strongPassword)
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
                    .set(...tokens['grafana_rw_admin'])
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('grafana_rw_admin')
                expect(response.headers[userHeader]).toEqual('grafana_rw_admin')
            })

            it('returns admin with grafana_edit true', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_rw_admin'])
                    .send({grafana_edit: true})
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('admin')
                expect(response.headers[userHeader]).toEqual('admin')
            })

            it('returns admin with NGCP-Grafana-Edit: 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_rw_admin'])
                    .set('NGCP-Grafana-Edit', '1')
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('admin')
                expect(response.headers[userHeader]).toEqual('admin')
            })

            it('returns username with NGCP-Grafana-Edit: 0', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_rw_admin'])
                    .set('NGCP-Grafana-Edit', '0')
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('grafana_rw_admin')
            })

            it('grafana_edit in body takes precedence over the header', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_rw_admin'])
                    .set('NGCP-Grafana-Edit', '1')
                    .send({grafana_edit: false})
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('grafana_rw_admin')
            })

            it('fails with invalid grafana_edit', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_rw_admin'])
                    .send({grafana_edit: 'yes'})
                expect(response.status).toEqual(422)
            })

            it('read-only admin gets username without edit', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_ro_admin'])
                expect(response.status).toEqual(200)
                expect(response.body.grafana_user).toEqual('grafana_ro_admin')
                expect(response.headers[userHeader]).toEqual('grafana_ro_admin')
            })

            it('read-only admin is denied with grafana_edit true', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_ro_admin'])
                    .send({grafana_edit: true})
                expect(response.status).toEqual(403)
                expect(response.headers[userHeader]).toBeUndefined()
            })

            it('read-only admin is denied with NGCP-Grafana-Edit: 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_ro_admin'])
                    .set('NGCP-Grafana-Edit', '1')
                expect(response.status).toEqual(403)
            })

            it('read-only admin is still denied on other write endpoints', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...tokens['grafana_ro_admin'])
                    .send([])
                expect(response.status).toEqual(403)
            })

            it('reseller role is denied', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/grafana')
                    .set(...tokens['grafana_reseller'])
                expect(response.status).toEqual(403)
            })

            it('GET is not supported', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/grafana')
                    .set(...tokens['grafana_rw_admin'])
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Cleanup', () => {
        it('delete created admins bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .send(createdAdminIds)
            expect(result.status).toEqual(200)
        })
    })
})
