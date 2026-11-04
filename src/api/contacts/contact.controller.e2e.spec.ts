import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {ContactModule} from './contact.module'
import {ContactResponseDto} from './dto/contact-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type ContactPost = {
    reseller_id: number
    firstname?: string
    lastname?: string
    email?: string
    newsletter?: boolean
    status: ContactStatus
}

describe('Contact', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ContactModule, AppModule],
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
        describe('POST', () => {
            const contact1: ContactPost = {
                reseller_id: 1,
                firstname: 'test_c1_first',
                lastname: 'test_c1_last',
                email: 'test_c1@example.com',
                newsletter: false,
                status: ContactStatus.Active,
            }
            const contact2: ContactPost = {
                reseller_id: 1,
                firstname: 'test_c2_first',
                email: 'test_c2@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('create contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/contacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(contact1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/contacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(contact2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail create contact with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/contacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...contact1, reseller_id: 999911111122})
                expect(response.status).toEqual(422)
            })
            it('fail create contact without status', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/contacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({reseller_id: 1})
                expect(response.status).toEqual(422)
            })
            it('fail create contact with unknown field', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/contacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...contact1, unknown_field: 'x'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read contacts collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/contacts?email=test_c1@example.com')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                expect(response.body.data).toHaveLength(1)
                const contact: ContactResponseDto = response.body.data[0]
                expect(contact.id).toEqual(createdIds[0])
                expect(contact.firstname).toEqual('test_c1_first')
            })
            it('read contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(await validate(contact)).toEqual([])
                expect(contact.firstname).toEqual('test_c1_first')
                expect(contact.reseller_id).toEqual(1)
                expect(contact.newsletter).toEqual(false)
            })
            it('read contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contacts/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.newsletter).toEqual(true)
            })
            it('read non-existing contact', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/contacts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const contact3: ContactPost = {
                reseller_id: 1,
                firstname: 'test_c3_first',
                email: 'test_c3@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('update contact 1 -> 3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(contact3)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_c3_first')
                expect(contact.lastname).toBeNull()
                expect(contact.newsletter).toEqual(true)
            })
            it('update contact without Prefer returns no content', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(contact3)
                expect(response.status).toEqual(204)
                expect(response.body).toEqual({})
            })
            it('update non-existing contact', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/contacts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(contact3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/firstname', value: 'test_c4_first'},
                {op: 'replace', path: '/newsletter', value: false},
            ]
            it('adjust contact 3 -> 4', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patch)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_c4_first')
                expect(contact.email).toEqual('test_c3@example.com')
                expect(contact.newsletter).toEqual(false)
            })
            it('adjust contacts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/contacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/lastname', value: 'test_c4_last'}],
                        [createdIds[1]]: [{op: 'replace', path: '/lastname', value: 'test_c2_last'}],
                    })
                expect(response.status).toEqual(204)
            })
            it('read bulk adjusted contact', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contacts/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.lastname).toEqual('test_c2_last')
                expect(contact.firstname).toEqual('test_c2_first')
            })
            it('fail adjust contact with invalid status', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/status', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('adjust non-existing contact', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/contacts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })

        describe('field types', () => {
            it('read timestamps', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(new Date(response.body.create_timestamp).getTime()).not.toBeNaN()
                expect(new Date(response.body.modify_timestamp).getTime()).not.toBeNaN()
                expect(response.body.create_timestamp).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
                expect(response.body.terminate_timestamp).toBeNull()
            })
            it('fail create with invalid field types', async () => {
                const tt = [
                    {gender: 'unknown'},
                    {newsletter: 'yes'},
                    {country: 'Germany'},
                    {postcode: '12345678901234567'},
                    {firstname: 'x'.repeat(128)},
                    {email: 123},
                ]
                for (const fields of tt) {
                    const response = await request(app.getHttpServer())
                        .post('/api/contacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({...{reseller_id: 1, status: 'active'}, ...fields})
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain(Object.keys(fields)[0])
                }
            })
            it('fail adjust with invalid field types', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/gender', value: 'unknown'}])
                expect(response.status).toEqual(422)
            })
            it('fail adjust with empty status', async () => {
                const tt: PatchOperation[][] = [
                    [{op: 'replace', path: '/status', value: null}],
                    [{op: 'remove', path: '/status'}],
                ]
                for (const emptyPatch of tt) {
                    const response = await request(app.getHttpServer())
                        .patch(`/api/contacts/${createdIds[0]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('status should not be empty')
                }
            })
            it('clear fields with adjust', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([
                        {op: 'replace', path: '/gender', value: 'female'},
                        {op: 'replace', path: '/country', value: 'AT'},
                    ])
                expect(response.status).toEqual(200)
                expect(response.body.gender).toEqual('female')
                expect(response.body.country).toEqual('AT')
                const cleared = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([
                        {op: 'remove', path: '/gender'},
                        {op: 'replace', path: '/country', value: null},
                        {op: 'replace', path: '/newsletter', value: null},
                    ])
                expect(cleared.status).toEqual(200)
                expect(cleared.body.gender).toBeNull()
                expect(cleared.body.country).toBeNull()
                expect(cleared.body.newsletter).toEqual(false)
                expect(cleared.body.create_timestamp).toEqual(response.body.create_timestamp)
            })
            it('fail changing a customer contact to a system contact', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/reseller_id', value: null}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toContain('can not be changed between a system contact')
            })
            it('reject timestamps in adjust', async () => {
                const before = await request(app.getHttpServer())
                    .get(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const response = await request(app.getHttpServer())
                    .patch(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/terminate_timestamp', value: '2000-01-01 00:00:00'}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property terminate_timestamp should not exist')
                const after = await request(app.getHttpServer())
                    .get(`/api/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(after.body).toEqual(before.body)
            })
        })
    })

    describe('Contact DELETE', () => {
        it('delete created contacts', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/contacts/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(204)
            }
        })
        it('delete created journals', async () => {
            if (createdIds.length)
                await db.billing.Journal.delete({resource_name: 'contacts', resource_id: In(createdIds)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
