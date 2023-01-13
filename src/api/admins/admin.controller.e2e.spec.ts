import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {AppModule} from '../../app.module'
import {AppService} from '../../app.service'
import {AuthService} from '../../auth/auth.service'
import {AdminCreateDto} from './dto/admin-create.dto'
import {RbacRole} from '../../config/constants.config'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {HttpExceptionFilter} from '../../helpers/http-exception.filter'
import {ValidateInputPipe} from '../../pipes/validate.pipe'
import {AdminModule} from './admin.module'

describe('AdminController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdAdminIds: number[] = []
    let creds = {username: 'administrator', password: 'administrator'}

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
        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())

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
        describe('Create initial admins', () => {
            const admins: AdminCreateDto[] = [
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'adminmaster@example.com',
                    login: 'adminmaster',
                    password: 'adminmaster',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: false,
                    email: 'admin@example.com',
                    login: 'admin',
                    password: 'adminthere',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'system@example.com',
                    login: 'system',
                    password: 'system',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.system,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'resellermaster@example.com',
                    login: 'resellermaster',
                    password: 'resellermaster',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.reseller,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: false,
                    email: 'reseller@example.com',
                    login: 'reseller',
                    password: 'reseller',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.reseller,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'ccareadmin@example.com',
                    login: 'ccareadmin',
                    password: 'ccareadmin',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.ccareadmin,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'ccare@example.com',
                    login: 'ccare',
                    password: 'ccarethere',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.ccare,
                    show_passwords: true,
                }),
                AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'lintercept@example.com',
                    login: 'lintercept',
                    password: 'lintercept',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.lintercept,
                    show_passwords: true,
                }),
            ]
            for (const a of admins) {
                it('should create admin ' + a.login, async () => {
                    expect.assertions(1)
                    const response = await request(app.getHttpServer())
                        .post('/admins')
                        .set(...authHeader)
                        .send(a)
                    expect(response.status).toEqual(201)
                    createdAdminIds.push(+response.body.id)
                })
            }
        })

        describe('Admins GET', () => {
            const tt = [
                {username: 'system',
                password: 'system', want: 200, canSeeResellerId: true},
                {username: 'adminmaster',
                password: 'adminmaster', want: 200, canSeeResellerId: true},
                {username: 'admin',
                password: 'adminthere', want: 200, canSeeResellerId: true},
                {username: 'resellermaster',
                password: 'resellermaster', want: 200, canSeeResellerId: false},
                {username: 'reseller',
                password: 'reseller', want: 200, canSeeResellerId: false},
                {username: 'ccareadmin',
                password: 'ccareadmin', want: 200, canSeeResellerId: true},
                {username: 'ccare',
                password: 'ccarethere', want: 200, canSeeResellerId: false},
                {username: 'lintercept',
                password: 'lintercept', want: 403, canSeeResellerId: false},
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
        })

        describe('Admins POST', () => {
            const tt = [
                {
                    username: 'system',
                    password: 'system', roles: [
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
                    password: 'adminmaster', roles: [
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
                    password: 'adminthere', roles: [
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
                    password: 'resellermaster', roles: [
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
                    password: 'reseller', roles: [
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
                    password: 'ccareadmin', roles: [
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
                    password: 'ccarethere', roles: [
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
                    password: 'lintercept', roles: [
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
                        const data = AdminCreateDto.create({
                            billing_data: true,
                            call_data: false,
                            can_reset_password: true,
                            is_active: true,
                            is_master: roleTest.isMaster,
                            email: `${test.username}_create_${rand}@example.com`,
                            login: `${test.username}_create_${rand}`,
                            password: `${test.username}_create${rand}`,
                            read_only: false,
                            reseller_id: 1,
                            role: roleTest.role,
                            show_passwords: true,
                        })
                        const response = await request(app.getHttpServer())
                            .post('/admins')
                            .auth(test.username, test.password)
                            .send(data)
                        expect(response.status).toEqual(roleTest.want)
                        if (response.status == 201) {
                            if (test.canSeeResellerId)
                                expect(response.body.reseller_id).toBeDefined()
                            else {
                                expect(response.body.reseller_id).not.toBeDefined()
                            }
                            createdAdminIds.push(+response.body.id)
                        }
                    })
                }
            }
            it('should fail if required fields are missing', async () => {
                const data = AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                })
                const want = 422
                const response = await request(app.getHttpServer())
                    .post('/admins')
                    .set(...authHeader)
                    .send(data)
                expect(response.status).toEqual(want)
            })
        })

        describe('Admins PATCH', () => {
            let createdId: number
            it('should create admin', async () => {
                const data = AdminCreateDto.create({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: 'update_self@example.com',
                    login: 'update_self',
                    password: 'update_self',
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.admin,
                    show_passwords: true,
                })
                const response = await request(app.getHttpServer())
                    .post('/admins')
                    .set(...authHeader)
                    .send(data)
                expect(response.status).toEqual(201)
                createdId = response.body.id
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
                        .auth('update_self', 'update_self')
                        .send(patch)
                    expect(patchResponse.status).toEqual(403)
                })
            }
        })

    })

    describe('Admins DELETE', () => {
        it('delete created admins', async () => {
            for (const id of createdAdminIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/admins/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}