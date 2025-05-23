import {HttpStatus, INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {AdminModule} from './admin.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
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
    otp_init?: boolean
    otp_secret_key?: string
}

describe('AdminController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const preferHeader: [string, string] = ['prefer', 'return=representation']
    let createdAdminIds: number[] = []
    const strongPassword = 'FFFooobarbaz123!!!' //  MT#60560
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AdminModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdAdminIds = []

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe({whitelist: true, forbidNonWhitelisted: true}))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

        await app.init()
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
            .post('/auth/jwt')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
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
                    login: 'adminmaster',
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
                    login: 'admin',
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
                    login: 'system',
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
                    login: 'resellermaster',
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
                    login: 'reseller',
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
                    login: 'ccareadmin',
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
                    login: 'ccare',
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
                    login: 'lintercept',
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
                    login: '2faProvidedSecret',
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
                    login: '2faGeneratedSecret',
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
                    .post('/admins')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(single)
                expect(response.status).toEqual(201)
                createdAdminIds.push(+response.body[0].id)
            })
            it('should create admins bulk', async () => {
                expect.assertions(1)
                const response = await request(app.getHttpServer())
                    .post('/admins')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(admins)
                expect(response.status).toEqual(201)
                for (const admin of response.body) {
                    createdAdminIds.push(+admin.id)
                }
            })
        })

        describe('Admins GET', () => {
            const tt = [
                {
                    username: 'system',
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: 'adminmaster',
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: 'admin',
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: 'resellermaster',
                    password: strongPassword, want: 200, canSeeResellerId: false,
                },
                {
                    username: 'reseller',
                    password: strongPassword, want: 200, canSeeResellerId: false,
                },
                {
                    username: 'ccareadmin',
                    password: strongPassword, want: 200, canSeeResellerId: true,
                },
                {
                    username: 'ccare',
                    password: strongPassword, want: 200, canSeeResellerId: false,
                },
                {
                    username: 'lintercept',
                    password: strongPassword, want: 403, canSeeResellerId: false,
                },
            ]
            for (const test of tt) {
                it('finds all admins as role: ' + test.username, async () => {
                    const response = await request(app.getHttpServer())
                        .get('/admins')
                        .auth(test.username, test.password)
                    expect(response.status).toEqual(test.want)
                    if (response.body[0] !== undefined) {
                        if (test.canSeeResellerId)
                            expect(response.body[0][0].reseller_id).toBeDefined()
                        else {
                            expect(response.body[0][0].reseller_id).not.toBeDefined()
                        }
                    }
                })
            }
            it('throws error because 2fa is enabled but no token is provided', async () => {
                const response = await request(app.getHttpServer())
                    .get('/admins?login=2faProvidedSecret')
                    .auth('2faProvidedSecret', strongPassword)
                expect(response.status).toEqual(403)
            })
            it('hides otp_secret from other users', async () => {
                const response = await request(app.getHttpServer())
                    .get('/admins?login=2faGeneratedSecret')
                    .auth('adminmaster', strongPassword)
                expect(response.status).toEqual(200)
                expect(response.body[0][0].otp_secret_key).toBeUndefined()

                const res = await db.billing.Admin.findOne({where: {login: '2faGeneratedSecret'}})
                expect(res.otp_secret).toBeDefined()
            })
            it('generates otp_secret if enable_2fa is set but otp_secret_key is not set', async () => {
                const res = await db.billing.Admin.findOne({where: {login: '2faGeneratedSecret'}})
                expect(res.otp_secret).toBeDefined()
            })
            it('uses otp_secret if enable_2fa is set and otp_secret_key is set', async () => {
                const res = await db.billing.Admin.findOne({where: {login: '2faProvidedSecret'}})
                expect(res.otp_secret).toBe('3SLSWZPQQBB7WBRYDAQZ5J77W5D7I6GU')
            })
            it('makes otp_secret null and otp_ini to false if enable_2fa is not set', async () => {
                const response = await request(app.getHttpServer())
                    .get('/admins?login=adminmaster')
                    .auth('adminmaster', strongPassword)
                expect(response.status).toEqual(200)
                expect(response.body[0][0].otp_secret_key).toBeNull()
                expect(response.body[0][0].enable_2fa).toBe(false)
            })
        })

        describe('Admins POST', () => {
            const tt = [
                {
                    username: 'system',
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
                    username: 'adminmaster',
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
                    username: 'admin',
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
                    username: 'resellermaster',
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
                    username: 'reseller',
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
                    username: 'ccareadmin',
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
                    username: 'ccare',
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
                    username: 'lintercept',
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
                            login: `${test.username}_create_${rand}`,
                            password: `${strongPassword}_create${rand}`,
                            read_only: false,
                            reseller_id: 1,
                            role: roleTest.role,
                            show_passwords: true,
                            enable_2fa: false,
                        }
                        const response = await request(app.getHttpServer())
                            .post('/admins')
                            .set(...preferHeader)
                            .auth(test.username, test.password)
                            .send(data)
                        expect(response.status).toEqual(roleTest.want)
                        if (response.status == 201) {
                            if (test.canSeeResellerId)
                                expect(response.body[0].reseller_id).toBeDefined()
                            else {
                                expect(response.body[0].reseller_id).not.toBeDefined()
                            }
                            createdAdminIds.push(+response.body[0].id)
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
                    .post('/admins')
                    .set(...authHeader)
                    .set(...preferHeader)
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
                    .post('/admins')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(data)
                expect(response.status).toEqual(want)
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
                    login: 'update_self',
                    password: strongPassword,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                    enable_2fa: false,
                }
                const response = await request(app.getHttpServer())
                    .post('/admins')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(data)
                expect(response.status).toEqual(201)
                createdId = response.body[0].id
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
                        .patch(`/admins/${createdId}`)
                        .auth('update_self', strongPassword)
                        .send(patch)
                    expect(patchResponse.status).toEqual(403)
                })
            }
            it('should fail password validation', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/password', value: 'weakpassword'},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/admins/${createdId}`)
                    .auth('update_self', strongPassword)
                    .send(patch)
                expect(patchResponse.status).toEqual(422)
            })
            it('should turn on 2fa', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/enable_2fa', value: true},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/admins/${createdId}`)
                    .auth('update_self', strongPassword)
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
            const single = createdAdminIds.pop()
            if (single != undefined) {
                const result = await request(app.getHttpServer())
                    .delete(`/admins/${single}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
        it('delete created admins bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/admins/')
                .set(...authHeader)
                .send(createdAdminIds)
            expect(result.status).toEqual(200)
        })
        it('fail if double array', async () => {
            const result = await request(app.getHttpServer())
                .delete('/admins/')
                .set(...authHeader)
                .send([1.2, 3.4])
            expect(result.status).toEqual(400)
        })
        it('fail if not array', async () => {
            const result = await request(app.getHttpServer())
                .delete('/admins/')
                .set(...authHeader)
                .send({id: 1})
            expect(result.status).toEqual(400)
        })
        it('fails if body and params are defined', async () => {
            const result = await request(app.getHttpServer())
                .delete('/admins/2')
                .set(...authHeader)
                .send([2])
            expect(result.status).toEqual(400)
        })
        it('fails if no body and no params are defined', async () => {
            const result = await request(app.getHttpServer())
                .delete('/admins')
                .set(...authHeader)
            expect(result.status).toEqual(400)
        })
    })
})

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}
