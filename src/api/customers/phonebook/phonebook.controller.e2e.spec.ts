
import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {CustomerPhonebookResponseDto} from './dto/phonebook-response.dto'
import {CustomerPhonebookModule} from './phonebook.module'

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

type PhonebookPost = {
    name: string
    number: string
    customer_id: number
}

describe('Customer Phonebook', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdPhonebookIds: number[] = []
    const createdContractIds: number[] = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerPhonebookModule, AppModule],
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
            it('create phonebook bulk with purge_existing', async () => {
                const contract = await db.billing.Contract.create({
                    contact_id: 1,
                    product_id: 4,
                }).save()
                createdContractIds.push(contract.id)
                // test this first so it doesnt affect other tests via purge
                const purgeTest = await db.billing.ContractPhonebook.create({
                    contract_id: contract.id,
                    name: 'test',
                    number: '123',
                }).save()
                createdPhonebookIds.push(purgeTest.id)

                const csvContent = [
                    'customer_id,name,number',
                    `${contract.id},CUST_PHONEBOOK_TEST1,999999`,
                    `${contract.id},CUST_PHONEBOOK_TEST2,989832`,
                ].join('\n')

                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook?purge_existing=true')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.pop()
                createdPhonebookIds.push(+response.body.data[0].id)
                createdPhonebookIds.push(+response.body.data[1].id)

                const cnt = await db.billing.ContractPhonebook.count({where: {contract_id: contract.id}})
                expect(cnt).toEqual(2)
            })
            it('create phonebook', async () => {
                const phonebook1: PhonebookPost = {
                    name: 'test_phonebook1',
                    number: '123',
                    customer_id: createdContractIds[0],
                }
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebook1)
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body.data[0].id)
            })
            it('creates phonebook bulk from csv', async () => {
                const csvContent = [
                    'customer_id,name,number',
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST3,70003`,
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST4,70004`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body.data[0].id)
                createdPhonebookIds.push(+response.body.data[1].id)
            })
            it('fails to create phonebook bulk because duplicate', async () => {
                const csvContent = [
                    'customer_id,name,number',
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST3,70003`,
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST4,70004`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read phonebook collection', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook?customer_id=${createdContractIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(5)
                expect(response.body.data).toHaveLength(5)
            })
            it('read created phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebook: CustomerPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('test_phonebook1')
                expect(phonebook.number).toEqual('123')
                expect(phonebook.customer_id).toEqual(createdContractIds[0])
            })
            it('read created phonebook from csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[3]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebook: CustomerPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('CUST_PHONEBOOK_TEST3')
            })
            it('read phonebook as csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook?customer_id=${createdContractIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'text/csv')
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toContain('text/csv')
                expect(response.text).toContain('CUST_PHONEBOOK_TEST3')
            })
            it('read non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update phonebook test_phonebook1 > test_phonebook_foo', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo',
                    number: '123',
                    customer_id: createdContractIds[0],
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebookfoo)
                expect(response.status).toEqual(204)
            })
            it('read updated phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebookset: CustomerPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foo')
            })
            it('update non-existing phonebook', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo_bar',
                    number: '1234',
                    customer_id: createdContractIds[0],
                }
                const response = await request(app.getHttpServer())
                    .put('/api/customers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebookfoo)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_phonebook_foobar',
                },
                {
                    op: 'replace',
                    path: '/number',
                    value: '999',
                },
            ]
            it('adjust phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated phonebook  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebookset: CustomerPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foobar')
                expect(phonebookset.number).toEqual('999')
            })
            it('adjust non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('phonebook DELETE', () => {
        it('delete created phonebook', async () => {
            for (const id of createdPhonebookIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/customers/phonebook/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
            if (createdContractIds.length)
                await db.billing.Contract.delete(createdContractIds)
        })
        it('delete created journals', async () => {
            // journals take the first path segment as resource_name
            if (createdPhonebookIds.length)
                await db.billing.Journal.delete({
                    resource_name: 'customers',
                    resource_id: In(createdPhonebookIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
