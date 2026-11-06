import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {CustomerContactModule} from './customer-contact.module'
import {CustomerContactResponseDto} from './dto/customer-contact-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ErrorEntry} from '~/helpers/errors.helper'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

const SIPACCOUNT_PRODUCT_ID = 4

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
    const fixtureContractIds: number[] = []
    let resellerAdminId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const resellerCreds = {username: `cc_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerContactModule, AppModule],
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
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(contact1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create customer contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(contact2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail create customer contact with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...contact1, reseller_id: 999911111122})
                expect(response.status).toEqual(422)
            })
            it('fail create customer contact without status', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({reseller_id: 1})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read customer contacts collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customercontacts?email=test_cc1@example.com')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                const contact: CustomerContactResponseDto = response.body.data[0]
                expect(contact.id).toEqual(createdIds[0])
                expect(contact.firstname).toEqual('test_cc1_first')
            })
            it('read customer contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(await validate(contact)).toEqual([])
                expect(contact.firstname).toEqual('test_cc1_first')
                expect(contact.reseller_id).toEqual(1)
                expect(contact.newsletter).toEqual(false)
            })
            it('read customer contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.newsletter).toEqual(true)
            })
            it('read non-existing customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customercontacts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
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
                    .put(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(contact3)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_cc3_first')
                expect(contact.lastname).toBeNull()
                expect(contact.newsletter).toEqual(true)
            })
            it('update non-existing customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/customercontacts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
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
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patch)
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_cc4_first')
                expect(contact.email).toEqual('test_cc3@example.com')
                expect(contact.newsletter).toEqual(false)
            })
            it('adjust customer contacts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/lastname', value: 'test_cc4_last'}],
                        [createdIds[1]]: [{op: 'replace', path: '/lastname', value: 'test_cc2_last'}],
                    })
                expect(response.status).toEqual(204)
            })
            it('read bulk adjusted customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contact: CustomerContactResponseDto = response.body
                expect(contact.lastname).toEqual('test_cc2_last')
                expect(contact.firstname).toEqual('test_cc2_first')
            })
            it('fail adjust customer contact with invalid status', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/status', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('adjust non-existing customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customercontacts/999911111122')
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
                    .get(`/api/customercontacts/${createdIds[0]}`)
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
                        .post('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({...{reseller_id: 1, status: 'active'}, ...fields})
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.errors)).toContain(Object.keys(fields)[0])
                }
            })
            it('fail adjust with invalid field types', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
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
                        .patch(`/api/customercontacts/${createdIds[0]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.errors)).toContain('status should not be empty')
                }
            })
            it('clear fields with adjust', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
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
                    .patch(`/api/customercontacts/${createdIds[0]}`)
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
            it('reject timestamps in adjust', async () => {
                const before = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/terminate_timestamp', value: '2000-01-01 00:00:00'}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property terminate_timestamp should not exist')
                const after = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(after.body).toEqual(before.body)
            })
        })

        describe('errors', () => {
            const valid = {reseller_id: 1, status: ContactStatus.Active}

            it('return the envelope with pointers for a single POST', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...valid, status: 'bogus', colour: 'blue'})
                expect(response.status).toEqual(422)
                expect(response.body).toEqual({
                    tx: expect.any(String),
                    statusCode: 422,
                    path: '/api/customercontacts',
                    method: 'POST',
                    error: 'Unprocessable Entity',
                    errorCode: 'VALIDATION_FAILED',
                    message: 'Validation failed',
                    errors: expect.arrayContaining([
                        {pointer: '/status', code: 'isEnum', message: expect.any(String)},
                        {pointer: '/colour', code: 'whitelistValidation', message: 'property colour should not exist'},
                    ]),
                })
                expect(response.body.errors).toHaveLength(2)
                expect(response.body.tx).not.toEqual('')
            })
            it('report every failing item of a bulk POST', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send([valid, {...valid, status: 'bogus'}, {...valid, firstname: 5}])
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('VALIDATION_FAILED')
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    ['/1/status', 'isEnum'],
                    ['/2/firstname', 'maxLength'],
                    ['/2/firstname', 'isString'],
                ])
            })
            it('cap the reported errors', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(Array.from({length: 101}, () => ({...valid, status: 'bogus'})))
                expect(response.status).toEqual(422)
                expect(response.body.errors.length).toEqual(100)
                expect(response.body.errors[99].pointer).toEqual('/99/status')
                expect(response.body.message).toEqual('Validation failed (100 of 101 errors shown)')
            })
            it('report every failing item of a bulk PUT', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[0]]: {...valid, status: 'bogus'},
                        [createdIds[1]]: {...valid, status: 'bogus'},
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    [`/${createdIds[0]}/status`, 'isEnum'],
                    [`/${createdIds[1]}/status`, 'isEnum'],
                ])
            })
            it('return 400 with pointers into the patch document for a malformed PATCH', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([
                        {op: 'replace', path: '/firstname', value: 'test_cc_ok'},
                        {op: 'bogus', path: '/firstname', value: 'x'},
                        {op: 'replace', path: '/lastname'},
                    ])
                expect(response.status).toEqual(400)
                expect(response.body.errorCode).toEqual('INVALID_JSON_PATCH')
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    ['/1/op', 'OPERATION_OP_INVALID'],
                    ['/2/value', 'OPERATION_VALUE_REQUIRED'],
                ])
            })
            it('return 409 for a failed test operation', async () => {
                const before = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([
                        {op: 'test', path: '/firstname', value: 'not_the_firstname'},
                        {op: 'replace', path: '/firstname', value: 'test_cc_changed'},
                    ])
                expect(response.status).toEqual(409)
                expect(response.body.error).toEqual('Conflict')
                expect(response.body.errorCode).toEqual('JSON_PATCH_CONFLICT')
                expect(response.body.errors).toEqual([{pointer: '/0/value', code: 'TEST_OPERATION_FAILED', message: 'test operation failed'}])
                const after = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(after.body).toEqual(before.body)
            })
            it('apply a patch with a passing test operation', async () => {
                const before = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([
                        {op: 'test', path: '/firstname', value: before.body.firstname},
                        {op: 'replace', path: '/firstname', value: before.body.firstname},
                    ])
                expect(response.status).toEqual(200)
                expect(response.body.firstname).toEqual(before.body.firstname)
            })
            it('return 409 for a path that does not exist', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'copy', from: '/no_such_field', path: '/firstname'}])
                expect(response.status).toEqual(409)
                expect(response.body.errors).toEqual([{pointer: '/0/from', code: 'OPERATION_FROM_UNRESOLVABLE', message: expect.any(String)}])
            })
            it('return 422 with the field pointer for an invalid patched value', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/status', value: 'bogus'}])
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('VALIDATION_FAILED')
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([['/status', 'isEnum']])
            })
            it('report every failing item of a bulk PATCH', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/status', value: 'bogus'}],
                        [createdIds[1]]: [{op: 'replace', path: '/firstname', value: 5}],
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    [`/${createdIds[0]}/status`, 'isEnum'],
                    [`/${createdIds[1]}/firstname`, 'maxLength'],
                    [`/${createdIds[1]}/firstname`, 'isString'],
                ])
            })
            it('return 409 with the item pointer in a bulk PATCH', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/status', value: 'bogus'}],
                        [createdIds[1]]: [
                            {op: 'replace', path: '/firstname', value: 'test_cc_changed'},
                            {op: 'test', path: '/firstname', value: 'not_the_firstname'},
                        ],
                    })
                expect(response.status).toEqual(409)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([[`/${createdIds[1]}/1/value`, 'TEST_OPERATION_FAILED']])
            })
            it('return 400 with the item pointer for a malformed bulk PATCH', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({[createdIds[1]]: [{op: 'replace', path: 'firstname', value: 'x'}]})
                expect(response.status).toEqual(400)
                expect(response.body.errorCode).toEqual('INVALID_JSON_PATCH')
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([[`/${createdIds[1]}/0/path`, 'OPERATION_PATH_INVALID']])
            })
            it('return 400 INVALID_JSON for a malformed body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send('{"reseller_id": 1,')
                expect(response.status).toEqual(400)
                expect(response.body).toEqual({
                    tx: expect.any(String),
                    statusCode: 400,
                    path: '/api/customercontacts',
                    method: 'POST',
                    error: 'Bad Request',
                    errorCode: 'INVALID_JSON',
                    message: expect.any(String),
                })
            })
            it('return 400 INVALID_PARAMETER for an invalid path id', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customercontacts/abc')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(400)
                expect(response.body.errorCode).toEqual('INVALID_PARAMETER')
                expect(response.body.errors).toEqual([{parameter: 'id', code: 'isInt', message: 'id must be an integer number'}])
            })
            it('return 400 INVALID_PARAMETER for unknown and invalid query parameters', async () => {
                const unknown = await request(app.getHttpServer())
                    .get('/api/customercontacts?colour=blue&shape=round')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(unknown.status).toEqual(400)
                expect(unknown.body.errorCode).toEqual('INVALID_PARAMETER')
                expect(unknown.body.errors.map((e: ErrorEntry) => [e.parameter, e.code])).toEqual([
                    ['colour', 'whitelistValidation'],
                    ['shape', 'whitelistValidation'],
                ])
                const orderBy = await request(app.getHttpServer())
                    .get('/api/customercontacts?order_by=colour')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(orderBy.status).toEqual(400)
                expect(orderBy.body.errors.map((e: ErrorEntry) => [e.parameter, e.code])).toEqual([['order_by', 'isIn']])
            })
            it('return the errors.json key as errorCode in every language', async () => {
                for (const lang of ['en', 'de']) {
                    const response = await request(app.getHttpServer())
                        .post('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Accept-Language', lang)
                        .set('Content-Type', 'application/json')
                        .send({...valid, reseller_id: 999911111122})
                    expect(response.status).toEqual(422)
                    expect(response.body.errorCode).toEqual('RESELLER_ID_INVALID')
                    expect(response.body.error).toEqual('Unprocessable Entity')
                    expect(typeof response.body.message).toEqual('string')
                }
            })
            describe('business errors', () => {
                const unknownId = 999911111122
                it('point a business error to the field of a single item', async () => {
                    const response = await request(app.getHttpServer())
                        .post('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({...valid, reseller_id: unknownId})
                    expect(response.status).toEqual(422)
                    expect(response.body.errorCode).toEqual('RESELLER_ID_INVALID')
                    expect(response.body.message).toEqual('Invalid reseller_id')
                    expect(response.body.errors).toEqual([
                        {pointer: '/reseller_id', code: 'RESELLER_ID_INVALID', message: 'invalid reseller_id'},
                    ])
                })
                it('point a business error to the failing items of a bulk POST only', async () => {
                    const response = await request(app.getHttpServer())
                        .post('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send([valid, {...valid, reseller_id: unknownId}, valid, {...valid, reseller_id: unknownId}])
                    expect(response.status).toEqual(422)
                    expect(response.body.errorCode).toEqual('RESELLER_ID_INVALID')
                    expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                        ['/1/reseller_id', 'RESELLER_ID_INVALID'],
                        ['/3/reseller_id', 'RESELLER_ID_INVALID'],
                    ])
                })
                it('point a business error to the item id of a bulk PUT', async () => {
                    const response = await request(app.getHttpServer())
                        .put('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({[createdIds[0]]: {...valid, reseller_id: unknownId}})
                    expect(response.status).toEqual(422)
                    expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                        [`/${createdIds[0]}/reseller_id`, 'RESELLER_ID_INVALID'],
                    ])
                })
                it('report every unknown id of a bulk DELETE by its index', async () => {
                    const some = await request(app.getHttpServer())
                        .delete('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send([createdIds[0], unknownId, unknownId + 1])
                    expect(some.status).toEqual(422)
                    expect(some.body.errorCode).toEqual('ENTRY_NOT_FOUND')
                    expect(some.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                        ['/1', 'ENTRY_NOT_FOUND'],
                        ['/2', 'ENTRY_NOT_FOUND'],
                    ])
                    const all = await request(app.getHttpServer())
                        .delete('/api/customercontacts/')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send([unknownId])
                    expect(all.status).toEqual(422)
                    expect(all.body.errors).toEqual([{pointer: '/0', code: 'ENTRY_NOT_FOUND', message: 'entry not found'}])
                })
                it('return 404 for an unknown path id', async () => {
                    const response = await request(app.getHttpServer())
                        .delete(`/api/customercontacts/${unknownId}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(404)
                    expect(response.body.errors).toBeUndefined()
                })
                it('point a refused delete to the item (423 locked)', async () => {
                    const now = new Date()
                    const contract = await db.billing.Contract.create({
                        contact_id: createdIds[1],
                        product_id: SIPACCOUNT_PRODUCT_ID,
                        status: ContractStatus.Active,
                        create_timestamp: now,
                        modify_timestamp: now,
                    }).save()
                    fixtureContractIds.push(contract.id)
                    const response = await request(app.getHttpServer())
                        .delete('/api/customercontacts')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send([createdIds[0], createdIds[1]])
                    expect(response.status).toEqual(423)
                    expect(response.body.errorCode).toEqual('CONTACT_HAS_ACTIVE_CONTRACT')
                    expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                        ['/1', 'CONTACT_HAS_ACTIVE_CONTRACT'],
                    ])
                })
            })
            it('return the status name as errorCode for other errors', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customercontacts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
                expect(response.body.errorCode).toEqual('NOT_FOUND')
                expect(response.body.error).toEqual('Not Found')
                expect(response.body.errors).toBeUndefined()
            })
        })

        describe('reseller_id as admin', () => {
            it('fail create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        firstname: 'test_cc_no_reseller',
                        status: 'active',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('fail update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customercontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        firstname: 'test_cc_no_reseller',
                        status: 'active',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('fail adjust with empty reseller_id', async () => {
                const tt: PatchOperation[][] = [
                    [{op: 'replace', path: '/reseller_id', value: null}],
                    [{op: 'remove', path: '/reseller_id'}],
                ]
                for (const emptyPatch of tt) {
                    const response = await request(app.getHttpServer())
                        .patch(`/api/customercontacts/${createdIds[0]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
                }
            })
            it('fail bulk adjust with empty reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customercontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/firstname', value: 'bulk'}],
                        [createdIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors).toContainEqual({pointer: `/${createdIds[1]}/reseller_id`, code: 'isNotEmpty', message: 'reseller_id should not be empty'})
            })
        })

        describe('as reseller', () => {
            let resellerEntityId: number
            it('create reseller admin', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
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
                resellerAdminId = +response.body.data[0].id
            })
            it('fail create with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        firstname: 'test_cc_reseller',
                        email: 'test_cc_reseller@example.com',
                        status: 'active',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        firstname: 'test_cc_reseller',
                        email: 'test_cc_reseller@example.com',
                        status: 'active',
                    })
                expect(response.status).toEqual(201)
                resellerEntityId = +response.body.data[0].id
                createdIds.push(resellerEntityId)
            })
            it('read created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail update with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customercontacts/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        firstname: 'renamed_test_cc_reseller',
                        email: 'test_cc_reseller@example.com',
                        status: 'active',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customercontacts/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        firstname: 'renamed_test_cc_reseller',
                        email: 'test_cc_reseller@example.com',
                        status: 'active',
                    })
                expect(response.status).toEqual(204)
            })
            it('read updated by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail patch reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/reseller_id', value: 1}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('patch without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customercontacts/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/firstname', value: 'patched reseller'}])
                expect(response.status).toEqual(200)
                expect(response.body.firstname).toEqual('patched reseller')
            })
            it('read patched by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customercontacts/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })
    })

    describe('CustomerContact DELETE', () => {
        it('delete fixture contracts', async () => {
            if (fixtureContractIds.length)
                await db.billing.Contract.delete(fixtureContractIds)
        })
        it('delete created customer contacts', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/customercontacts/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(204)
            }
        })
        it('delete reseller admin', async () => {
            if (!resellerAdminId)
                return
            const response = await request(app.getHttpServer())
                .delete(`/api/admins/${resellerAdminId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(response.status).toEqual(204)
        })
        it('delete created journals', async () => {
            if (createdIds.length)
                await db.billing.Journal.delete({resource_name: 'customercontacts', resource_id: In(createdIds)})
            if (resellerAdminId)
                await db.billing.Journal.delete({resource_name: 'admins', resource_id: resellerAdminId})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
