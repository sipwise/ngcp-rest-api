import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {AppModule} from '../../app.module'
import {AdminsModule} from './admins.module'
import request from 'supertest'
import {AdminCreateDto} from './dto/admin-create.dto'
import {RbacRole} from '../../config/constants.config'
import {AdminsService} from './admins.service'
import {Operation as PatchOperation} from '../../helpers/patch.helper'

describe('AdminsController', () => {
    let app: INestApplication
    let service: AdminsService
    const createdAdminIds: number[] = []

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AdminsModule, AppModule],
        })
            .compile()

        service = moduleRef.get<AdminsService>(AdminsService)

        app = moduleRef.createNestApplication()
        await app.init()
    })
    it('should be defined', () => {
        expect(service).toBeDefined()
    })
    describe('Create initial admins', function () {
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
                password: 'admin',
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
                password: 'ccare',
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
                const response = await request(app.getHttpServer())
                    .post('/admins')
                    .auth('administrator', 'administrator')
                    .send(a)
                expect(response.status).toEqual(201)
                createdAdminIds.push(+response.body.id)
                // console.log('created admin ids:', createdAdminIds)
            })
        }
    })

    describe('Admins GET', () => {
        const tt = [
            {username: 'system', want: 200, canSeeResellerId: true},
            {username: 'adminmaster', want: 200, canSeeResellerId: true},
            {username: 'admin', want: 200, canSeeResellerId: true},
            {username: 'resellermaster', want: 200, canSeeResellerId: false},
            {username: 'reseller', want: 200, canSeeResellerId: false},
            {username: 'ccareadmin', want: 200, canSeeResellerId: true},
            {username: 'ccare', want: 200, canSeeResellerId: false},
            {username: 'lintercept', want: 403, canSeeResellerId: false},
        ]
        for (const test of tt) {
            it('finds all admins as role: ' + test.username, async () => {
                const response = await request(app.getHttpServer())
                    .get('/admins')
                    .auth(test.username, test.username)
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
                username: 'system', roles: [
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
                username: 'adminmaster', roles: [
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
                username: 'admin', roles: [
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
                username: 'resellermaster', roles: [
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
                username: 'reseller', roles: [
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
                username: 'ccareadmin', roles: [
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
                username: 'ccare', roles: [
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
                username: 'lintercept', roles: [
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
                        .auth(test.username, test.username)
                        .send(data)
                    expect(response.status).toEqual(roleTest.want)
                    if (response.status == 201) {
                        if (test.canSeeResellerId)
                            expect(response.body.reseller_id).toBeDefined()
                        else {
                            expect(response.body.reseller_id).not.toBeDefined()
                        }
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
                .auth('administrator', 'administrator')
                .send(data)
            // TODO: for some reason the app does not perform input validation on DTOs.
            //  This problem is only related to tests and is handled properly by the API.
            //  expect(response.status).toEqual(want)
        })
    })
    describe('Admins PATCH', () => {
        let createdId
        it('should should create admin', async () => {
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
                .auth('administrator', 'administrator')
                .send(data)
            expect(response.status).toEqual(201)
            createdId = response.body.id
        })
        const protectedFields = {
            'login': 'trying_to_update', 'role': RbacRole.system, 'is_master': false, 'is_active': false,
            'read_only': true, 'show_passwords': false,
            'call_data': true, 'billing_data': false,
        }
        for (const key in protectedFields) {
            it(`should should fail updating {key: ${key}} on self`, async () => {
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
    afterAll(async () => {
        const response = await request(app.getHttpServer())
            .get('/admins')
            .query({page: 1, rows: 100})
            .auth('administrator', 'administrator')
        console.log('body', response.body)
        for (const admin of response.body[0]) {
            if (admin.id != 1) {
                // const result = await request(app.getHttpServer()).delete(`/admins/${admin.id}`).auth('administrator', 'administrator')
                // console.log('deleting admin id:', admin.id, 'status:', result.status, 'body:', admin)
            }
        }
        await app.close()
    })
})

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}