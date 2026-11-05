import {ClassSerializerInterceptor, HttpStatus, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {AdminModule} from './admin.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type AdminPost = {
    email: string
    reseller_id?: number
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
    otp_init?: boolean
    otp_secret_key?: string
}

describe('AdminController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let systemAuthHeader: [string, string]
    let createdAdminIds: number[] = []
    const strongPassword = 'FFFooobarbaz123!!!' //  MT#60560
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const systemCreds = {username: `mockSystemUser${process.env.JEST_WORKER_ID}`, password: 'mockSystemPass'}
    const run = Date.now().toString(36)
    const loginOf = (name: string): string => `${name}_${run}`

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AdminModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdAdminIds = []

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

        // creating and deleting system and lintercept admins needs the system role
        const mockAdmins = [
            {login: creds.username, role: RbacRole.admin, is_superuser: true, is_system: false},
            {login: systemCreds.username, role: RbacRole.system, is_superuser: false, is_system: true},
        ]
        for (const mockAdmin of mockAdmins) {
            await db.billing.Admin.delete({login: mockAdmin.login})
            const role = await db.billing.AclRole.findOneByOrFail({role: mockAdmin.role})
            await db.billing.Admin.insert({
                reseller_id: 1,
                login: mockAdmin.login,
                saltedpass: 'mockAdminSaltedpass',
                saltedpass_modify_timestamp: new Date(),
                role_id: role.id,
                is_master: true,
                is_superuser: mockAdmin.is_superuser,
                is_system: mockAdmin.is_system,
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
        }
    })

    afterAll(async () => {
        await app.close()
    })

    it('should be defined', () => {
        expect(app).toBeDefined()
    })

    it('db connection', () => {
        expect(appService.isDbInitialised).toBe(true)
        expect(appService.isDbAvailable).toBe(true)
    })

    it('should load db entities', async () => {
        const admin = db.billing.Admin.create()
        admin.is_active = true
        admin.email = 'staticadmin@example.com'
        admin.role_id = 1
        admin.is_master = true
        admin.login = 'staticadmin'
        admin.saltedpass = strongPassword

        const result = await db.billing.Admin.insert(admin)
        expect(result.identifiers.length).toBeGreaterThan(0)
        createdAdminIds.push(result.identifiers[0].id)
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

    it('obtain system auth token', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(systemCreds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        systemAuthHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('Create initial admins', () => {
            const admins: AdminPost[] = [
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'adminmaster@example.com',
                    login: loginOf('adminmaster'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: false,
                    email: 'admin@example.com',
                    login: loginOf('admin'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'system@example.com',
                    login: loginOf('system'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.system,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'resellermaster@example.com',
                    login: loginOf('resellermaster'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.reseller,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: false,
                    email: 'reseller@example.com',
                    login: loginOf('reseller'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.reseller,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'ccareadmin@example.com',
                    login: loginOf('ccareadmin'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.ccareadmin,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'ccare@example.com',
                    login: loginOf('ccare'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.ccare,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'lintercept@example.com',
                    login: loginOf('lintercept'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.lintercept,
                    show_passwords: true,
                    enable_2fa:false,
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: '2faProvidedSecret@example.com',
                    login: loginOf('2faProvidedSecret'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa:true,
                    otp_secret_key: '3SLSWZPQQBB7WBRYDAQZ5J77W5D7I6GU',
                },
                {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: '2faGeneratedSecret@example.com',
                    login: loginOf('2faGeneratedSecret'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa:true,
                },
            ]
            const single = admins.pop()
            it('should create single admin ' + single.login, async () => {
                expect.assertions(1)
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...systemAuthHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(single)
                expect(response.status).toEqual(201)
                createdAdminIds.push(+response.body.data[0].id)
            })
            it('should create admins bulk', async () => {
                expect.assertions(1)
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...systemAuthHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(admins)
                expect(response.status).toEqual(201)
                for (const admin of response.body.data) {
                    createdAdminIds.push(+admin.id)
                }
            })
        })

        describe('Admins GET', () => {
            const tt = [
                {
                    username: loginOf('system'),
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: loginOf('adminmaster'),
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: loginOf('admin'),
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: loginOf('resellermaster'),
                    password: strongPassword, want: 200, canSeeResellerId: false,
                },
                {
                    username: loginOf('reseller'),
                    password: strongPassword, want: 200, canSeeResellerId: false,
                },
                {
                    username: loginOf('ccareadmin'),
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: loginOf('ccare'),
                    password: strongPassword, want: 200, canSeeResellerId: false,
                },
                {
                    username: loginOf('lintercept'),
                    password: strongPassword, want: 403, canSeeResellerId: false,
                },
            ]
            for (const test of tt) {
                it('finds all admins as role: ' + test.username, async () => {
                    const response = await request(app.getHttpServer())
                        .get('/api/admins')
                        .auth(test.username, test.password)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(test.want)
                    if (response.body.data !== undefined) {
                        if (test.canSeeResellerId)
                            expect(response.body.data[0].reseller_id).toBeDefined()
                        else {
                            expect(response.body.data[0].reseller_id).not.toBeDefined()
                        }
                    }
                })
            }
            it('hides otp_secret from other users', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/admins?login=${loginOf('2faGeneratedSecret')}`)
                    .auth(loginOf('adminmaster'), strongPassword)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.data[0].otp_secret_key).toBeUndefined()

                const res = await db.billing.Admin.findOne({where: {login: loginOf('2faGeneratedSecret')}})
                expect(res.otp_secret).toBeDefined()
            })
            it('generates otp_secret if enable_2fa is set but otp_secret_key is not set', async () => {
                const res = await db.billing.Admin.findOne({where: {login: loginOf('2faGeneratedSecret')}})
                expect(res.otp_secret).toBeDefined()
            })
            it('uses otp_secret if enable_2fa is set and otp_secret_key is set', async () => {
                const res = await db.billing.Admin.findOne({where: {login: loginOf('2faProvidedSecret')}})
                expect(res.otp_secret).toBe('3SLSWZPQQBB7WBRYDAQZ5J77W5D7I6GU')
            })
            it('makes otp_secret null and otp_ini to false if enable_2fa is not set', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/admins?login=${loginOf('adminmaster')}`)
                    .auth(loginOf('adminmaster'), strongPassword)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.data[0].otp_secret_key).toBeNull()
                expect(response.body.data[0].enable_2fa).toBe(false)
            })
        })

        describe('Admins POST', () => {
            const tt = [
                {
                    username: loginOf('system'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 201},
                        {role: RbacRole.admin, isMaster: true, want: 201},
                        {role: RbacRole.admin, isMaster: false, want: 201},
                        {role: RbacRole.reseller, isMaster: true, want: 201},
                        {role: RbacRole.reseller, isMaster: false, want: 201},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 201},
                        {role: RbacRole.ccare, isMaster: false, want: 201},
                        {role: RbacRole.lintercept, isMaster: false, want: 201},
                    ], canSeeResellerId: true,
                },
                {
                    username: loginOf('adminmaster'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 201},
                        {role: RbacRole.admin, isMaster: false, want: 201},
                        {role: RbacRole.reseller, isMaster: true, want: 201},
                        {role: RbacRole.reseller, isMaster: false, want: 201},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 201},
                        {role: RbacRole.ccare, isMaster: false, want: 201},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: true,
                },
                {
                    username: loginOf('admin'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 403},
                        {role: RbacRole.admin, isMaster: false, want: 403},
                        {role: RbacRole.reseller, isMaster: true, want: 403},
                        {role: RbacRole.reseller, isMaster: false, want: 403},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 403},
                        {role: RbacRole.ccare, isMaster: false, want: 403},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: true,
                },
                {
                    username: loginOf('resellermaster'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 403},
                        {role: RbacRole.admin, isMaster: false, want: 403},
                        {role: RbacRole.reseller, isMaster: true, want: 201},
                        {role: RbacRole.reseller, isMaster: false, want: 201},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 201},
                        {role: RbacRole.ccare, isMaster: false, want: 201},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: false,
                },
                {
                    username: loginOf('reseller'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 403},
                        {role: RbacRole.admin, isMaster: false, want: 403},
                        {role: RbacRole.reseller, isMaster: true, want: 403},
                        {role: RbacRole.reseller, isMaster: false, want: 403},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 403},
                        {role: RbacRole.ccare, isMaster: false, want: 403},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: false,
                },
                {
                    username: loginOf('ccareadmin'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 403},
                        {role: RbacRole.admin, isMaster: false, want: 403},
                        {role: RbacRole.reseller, isMaster: true, want: 403},
                        {role: RbacRole.reseller, isMaster: false, want: 403},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 403},
                        {role: RbacRole.ccare, isMaster: false, want: 403},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: true,
                },
                {
                    username: loginOf('ccare'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 403},
                        {role: RbacRole.admin, isMaster: false, want: 403},
                        {role: RbacRole.reseller, isMaster: true, want: 403},
                        {role: RbacRole.reseller, isMaster: false, want: 403},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 403},
                        {role: RbacRole.ccare, isMaster: false, want: 403},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: false,
                },
                {
                    username: loginOf('lintercept'),
                    password: strongPassword, roles: [
                        {role: RbacRole.system, isMaster: false, want: 403},
                        {role: RbacRole.admin, isMaster: true, want: 403},
                        {role: RbacRole.admin, isMaster: false, want: 403},
                        {role: RbacRole.reseller, isMaster: true, want: 403},
                        {role: RbacRole.reseller, isMaster: false, want: 403},
                        {role: RbacRole.ccareadmin, isMaster: false, want: 403},
                        {role: RbacRole.ccare, isMaster: false, want: 403},
                        {role: RbacRole.lintercept, isMaster: false, want: 403},
                    ], canSeeResellerId: false,
                },
            ]
            for (const test of tt) {
                for (const roleTest of test.roles) {
                    const message = roleTest.want == 201 ? 'succeed' : 'fail'
                    it(`${test.username}: should ${message} creating {role: ${roleTest.role}, isMaster: ${roleTest.isMaster}}`, async () => {
                        const rand = getRandomInt(10000, 99999)
                        const data: AdminPost = {
                            billing_data: true,
                            call_data: false,
                            can_reset_password: true,
                            is_active: true,
                            is_master: roleTest.isMaster,
                            email: `${test.username}_create_${rand}@example.com`,
                            login: `create_${rand}_${run}`,
                            password: `${strongPassword}_create${rand}`,
                            read_only: false,
                            ...(test.canSeeResellerId ? {reseller_id: 1} : {}),
                            role: roleTest.role,
                            show_passwords: true,
                            enable_2fa: false,
                        }
                        const response = await request(app.getHttpServer())
                            .post('/api/admins')
                            .auth(test.username, test.password)
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .set('Prefer', 'return=representation')
                            .send(data)
                        expect(response.status).toEqual(roleTest.want)
                        if (response.status == 201) {
                            if (test.canSeeResellerId)
                                expect(response.body.data[0].reseller_id).toBeDefined()
                            else {
                                expect(response.body.data[0].reseller_id).not.toBeDefined()
                            }
                            createdAdminIds.push(+response.body.data[0].id)
                        }
                    })
                }
            }
            it('should fail if required fields are missing', async () => {
                const data = {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                }
                const want = HttpStatus.UNPROCESSABLE_ENTITY
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(data)
                expect(response.status).toEqual(want)
            })
            it('should fail if invalid fields are provided', async () => {
                const data = {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa: false,
                }
                data['nonWhitelistedField'] = 'invalid'
                const want = HttpStatus.UNPROCESSABLE_ENTITY
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(data)
                expect(response.status).toEqual(want)
            })
        })

        describe('Admins reseller_id', () => {
            let adminCreatedId: number
            let resellerCreatedId: number
            const newAdmin = (login: string, role: RbacRole, password = strongPassword): Omit<AdminPost, 'reseller_id'> => ({
                billing_data: true,
                call_data: false,
                can_reset_password: true,
                is_active: true,
                is_master: false,
                email: `${login}@example.com`,
                login: login,
                password: password,
                read_only: false,
                role: role,
                show_passwords: true,
                enable_2fa: false,
            })
            it('admin: should fail creating admin without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(newAdmin('rid_admin_none', RbacRole.admin))
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            })
            it('admin: should create admin with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({...newAdmin(loginOf('rid_admin'), RbacRole.admin), reseller_id: 1})
                expect(response.status).toEqual(201)
                adminCreatedId = +response.body.data[0].id
                createdAdminIds.push(adminCreatedId)
            })
            it('admin: should fail updating admin without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/admins/${adminCreatedId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(newAdmin(loginOf('rid_admin'), RbacRole.admin))
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            })
            it('admin: should fail emptying reseller_id with patch', async () => {
                const tt: PatchOperation[][] = [
                    [{op: 'replace', path: '/reseller_id', value: null}],
                    [{op: 'remove', path: '/reseller_id'}],
                ]
                for (const emptyPatch of tt) {
                    const response = await request(app.getHttpServer())
                        .patch(`/api/admins/${adminCreatedId}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
                }
            })
            it('admin: should update admin with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/admins/${adminCreatedId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({...newAdmin(loginOf('rid_admin'), RbacRole.admin, `${strongPassword}_put`), reseller_id: 1})
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('resellermaster: should fail creating admin with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .auth(loginOf('resellermaster'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...newAdmin(loginOf('rid_reseller'), RbacRole.reseller), reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('resellermaster: should create admin without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .auth(loginOf('resellermaster'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(newAdmin(loginOf('rid_reseller'), RbacRole.reseller))
                expect(response.status).toEqual(201)
                resellerCreatedId = +response.body.data[0].id
                createdAdminIds.push(resellerCreatedId)
            })
            it('resellermaster: should fail updating admin with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/admins/${resellerCreatedId}`)
                    .auth(loginOf('resellermaster'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...newAdmin(loginOf('rid_reseller'), RbacRole.reseller), reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('resellermaster: should fail patching reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/admins/${resellerCreatedId}`)
                    .auth(loginOf('resellermaster'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/reseller_id', value: 1}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('resellermaster: should patch admin without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/admins/${resellerCreatedId}`)
                    .auth(loginOf('resellermaster'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/email', value: 'rid_reseller_patched@example.com'}])
                expect(response.status).toEqual(200)
                expect(response.body.email).toEqual('rid_reseller_patched@example.com')
            })
            it('admin: should read the reseller_id of the user on admin created by resellermaster', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/admins/${resellerCreatedId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })

        describe('Admins PATCH', () => {
            let createdId: number
            it('should create admin', async () => {
                const data: AdminPost = {
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'update_self@example.com',
                    login: loginOf('update_self'),
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa: false,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(data)
                expect(response.status).toEqual(201)
                createdId = response.body.data[0].id
                createdAdminIds.push(createdId)
            })
            const protectedFields = {
                'login': 'trying_to_update', 'role': RbacRole.system, 'is_master': false, 'is_active': false,
                'read_only': true, 'show_passwords': false,
                'call_data': true, 'billing_data': false,
            }
            for (const key in protectedFields) {
                it(`should fail updating {key: ${key}} on self`, async () => {
                    const patch: PatchOperation[] = [
                        {op: 'replace', path: `/${key}`, value: protectedFields[key]},
                    ]
                    const patchResponse = await request(app.getHttpServer())
                        .patch(`/api/admins/${createdId}`)
                        .auth(loginOf('update_self'), strongPassword)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(patch)
                    expect(patchResponse.status).toEqual(403)
                })
            }
            it('should fail password validation', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/password', value: 'weakpassword'},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/api/admins/${createdId}`)
                    .auth(loginOf('update_self'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(patchResponse.status).toEqual(422)
            })
            it('should turn on 2fa', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/enable_2fa', value: true},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/api/admins/${createdId}`)
                    .auth(loginOf('update_self'), strongPassword)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patch)
                expect(patchResponse.status).toEqual(200)
                expect(patchResponse.body.enable_2fa).toEqual(true)
                expect(patchResponse.body.otp_secret_key).not.toBeNull()
                expect(patchResponse.body.otp_secret_key).toBeDefined()
                expect(patchResponse.body.otp_init).toBe(true)
            })
        })
    })

    describe('Admins DELETE', () => {
        it('delete single admin', async () => {
            const single = createdAdminIds[createdAdminIds.length - 1]
            if (single != undefined) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/admins/${single}`)
                    .set(...systemAuthHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created admins bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...systemAuthHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send(createdAdminIds.slice(0, -1))
            expect(result.status).toEqual(204)
        })
        it('fail if double array', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([1.2, 3.4])
            expect(result.status).toEqual(400)
        })
        it('fail if not array', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({id: 1})
            expect(result.status).toEqual(400)
        })
        it('fails if no trailing slash is provided', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins')
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(result.status).toEqual(404)
        })
        it('fails if no body and no params are defined', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(result.status).toEqual(400)
        })
        it('delete created journals', async () => {
            if (createdAdminIds.length)
                await db.billing.Journal.delete({resource_name: 'admins', resource_id: In(createdAdminIds)})
        })

        it('delete mock admins', async () => {
            await db.billing.Admin.delete({login: In([creds.username, systemCreds.username])})
        })
    })
})

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}
