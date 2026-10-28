import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {CustomerContactModule} from './customer-contact.module'
import {CustomerContactResponseDto} from './dto/customer-contact-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type CustomerContactPost = {
    reseller_id?: number
    firstname?: string
    lastname?: string
    email?: string
    newsletter?: boolean
    status: ContactStatus
}

describe('CustomerContact', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: 'administrator', password: 'administrator'}
    const resellerCreds = {username: 'cc_reseller', password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerContactModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

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
        describe('POST', () => {
            const contact1: CustomerContactPost = {
                reseller_id: 1,
                firstname: 'test_cc1_first',
                lastname: 'test_cc1_last',
                email: 'test_cc1@example.com',
                newsletter: false,
                status: ContactStatus.Active,
            }
            const contact2: CustomerContactPost = {
                reseller_id: 1,
                firstname: 'test_cc2_first',
                email: 'test_cc2@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('create customer contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customercontacts')
                    .set(...authHeader)
                    .send(contact1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create customer contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customercontacts')
                    .set(...authHeader)
                    .send(contact2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail create customer contact with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customercontacts')
                    .set(...authHeader)
                    .send({...contact1, reseller_id: 999911111122})
                expect(response.status).toEqual(422)
            })
            it('fail create customer contact without status', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customercontacts')
                    .set(...authHeader)
                    .send({reseller_id: 1})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read customer contacts collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customercontacts?email=test_cc1@example.com')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const collection = response.body
                expect(collection).toHaveLength(2)
                expect(collection[1]).toEqual(1)
                const contact: CustomerContactResponseDto = collection[0][0]
                expect(contact.id).toEqual(createdIds[0])
                expect(contact.firstname).toEqual('test_cc1_first')
            })
            it('read customer contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(await validate(contact)).toEqual([])
                expect(contact.firstname).toEqual('test_cc1_first')
                expect(contact.reseller_id).toEqual(1)
                expect(contact.newsletter).toEqual(false)
            })
            it('read customer contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customercontacts/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.newsletter).toEqual(true)
            })
            it('read non-existing customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customercontacts/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const contact3: CustomerContactPost = {
                reseller_id: 1,
                firstname: 'test_cc3_first',
                email: 'test_cc3@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('update customer contact 1 -> 3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(contact3)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_cc3_first')
                expect(contact.lastname).toBeNull()
                expect(contact.newsletter).toEqual(true)
            })
            it('update non-existing customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .put('/customercontacts/999911111122')
                    .set(...authHeader)
                    .send(contact3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/firstname', value: 'test_cc4_first'},
                {op: 'replace', path: '/newsletter', value: false},
            ]
            it('adjust customer contact 3 -> 4', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_cc4_first')
                expect(contact.email).toEqual('test_cc3@example.com')
                expect(contact.newsletter).toEqual(false)
            })
            it('adjust customer contacts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/customercontacts')
                    .set(...authHeader)
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/lastname', value: 'test_cc4_last'}],
                        [createdIds[1]]: [{op: 'replace', path: '/lastname', value: 'test_cc2_last'}],
                    })
                expect(response.status).toEqual(200)
                expect(response.body).toEqual(createdIds)
            })
            it('read bulk adjusted customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customercontacts/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.lastname).toEqual('test_cc2_last')
                expect(contact.firstname).toEqual('test_cc2_first')
            })
            it('fail adjust customer contact with invalid status', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send([{op: 'replace', path: '/status', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('adjust non-existing customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/customercontacts/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('CustomerContact reseller_id as admin', () => {
        it('fail create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/customercontacts')
                .set(...authHeader)
                .send({
                    firstname: 'test_cc_no_reseller',
                    status: 'active',
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
        })
        it('fail update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/customercontacts/${createdIds[0]}`)
                .set(...authHeader)
                .send({
                    firstname: 'test_cc_no_reseller',
                    status: 'active',
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
        })
        it('fail adjust with empty reseller_id', async () => {
            const tt: PatchOperation[][] = [
                [{op: 'replace', path: '/reseller_id', value: null}],
                [{op: 'remove', path: '/reseller_id'}],
            ]
            for (const emptyPatch of tt) {
                const response = await request(app.getHttpServer())
                    .patch(`/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(emptyPatch)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            }
        })
        it('fail bulk adjust with empty reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch('/customercontacts')
                .set(...authHeader)
                .send({
                    [createdIds[0]]: [{op: 'replace', path: '/firstname', value: 'bulk'}],
                    [createdIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain(`[${createdIds[1]}] reseller_id should not be empty`)
        })
    })

    describe('CustomerContact as reseller', () => {
        let resellerEntityId: number
        it('create reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .post('/admins')
                .set(...authHeader)
                .send({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: `${resellerCreds.username}@example.com`,
                    login: resellerCreds.username,
                    password: resellerCreds.password,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.reseller,
                    show_passwords: true,
                    enable_2fa: false,
                })
            expect(response.status).toEqual(201)
            resellerAdminId = +response.body[0].id
        })
        it('fail create with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/customercontacts')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    firstname: 'test_cc_reseller',
                    email: 'test_cc_reseller@example.com',
                    status: 'active',
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/customercontacts')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    firstname: 'test_cc_reseller',
                    email: 'test_cc_reseller@example.com',
                    status: 'active',
                })
            expect(response.status).toEqual(201)
            resellerEntityId = +response.body[0].id
            createdIds.push(resellerEntityId)
        })
        it('read created by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/customercontacts/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail update with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/customercontacts/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    firstname: 'renamed_test_cc_reseller',
                    email: 'test_cc_reseller@example.com',
                    status: 'active',
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/customercontacts/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    firstname: 'renamed_test_cc_reseller',
                    email: 'test_cc_reseller@example.com',
                    status: 'active',
                })
            expect(response.status).toEqual(200)
        })
        it('read updated by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/customercontacts/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail patch reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/customercontacts/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/reseller_id', value: 1}])
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('patch without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/customercontacts/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/firstname', value: 'patched reseller'}])
            expect(response.status).toEqual(200)
            expect(response.body.firstname).toEqual('patched reseller')
        })
        it('read patched by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/customercontacts/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('delete reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/admins/${resellerAdminId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
        })
    })

    describe('DELETE', () => {
        it('delete created customer contacts', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/customercontacts/${id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            }
        })
    })
})
