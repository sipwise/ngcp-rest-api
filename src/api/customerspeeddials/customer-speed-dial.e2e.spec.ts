import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {CustomerSpeedDialModule} from './customer-speed-dial.module'
import {CustomerSpeedDialResponseDto} from './dto/customer-speed-dial-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type CustomerSpeedDialPost = {
    customer_id: number
    slot: string
    destination: string
}

describe('CustomerSpeedDial', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const startedAt = Date.now() / 1000
    const domain = `e2e-csd-${Date.now().toString(36)}.example.org`
    let testCustomerId: number
    let billingDomainId: number
    let provisioningDomainId: number
    let provisioningSubscriberId: number
    const createdIds: number[] = []
    let createdEntries = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerSpeedDialModule, AppModule],
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

        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id
        testCustomerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
        const uuid = uuidv4()
        await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
            contract_id: testCustomerId,
            uuid: uuid,
            username: 'e2e_csd',
            domain_id: billingDomainId,
            status: 'active',
        })
        provisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
            username: 'e2e_csd',
            domain_id: provisioningDomainId,
            uuid: uuid,
            password: uuidv4().slice(0, 16),
            account_id: testCustomerId,
        })).identifiers[0].id
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
            const csd1: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*1',
                destination: '4310001',
            }
            const csd2: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*2',
                destination: '4310002',
            }
            it('create customer speed dial *1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customerspeeddials')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...csd1, customer_id: testCustomerId})
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create customer speed dial *2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customerspeeddials')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...csd2, customer_id: testCustomerId})
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail duplicate customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customerspeeddials')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...csd1, customer_id: testCustomerId})
                expect(response.status).toEqual(422)
            })
            it('validation fail customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customerspeeddials')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({customer_id: testCustomerId})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customerspeeddials/?customer_id=${testCustomerId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const csdCollection = response.body
                expect(csdCollection.total_count).toEqual(2)
                const csdEntries: CustomerSpeedDialResponseDto[] = csdCollection.data
                expect(await validate(csdEntries)).toEqual([])
                expect(csdEntries).toHaveLength(2)
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[0].slot).toEqual('*1')
                expect(csdEntries[0].destination).toMatch(RegExp('^sip:4310001@'))
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[1].slot).toEqual('*2')
                expect(csdEntries[1].destination).toMatch(RegExp('^sip:4310002@'))
                createdEntries = csdEntries
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customerspeeddials/9999111111')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const csd1: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*3',
                destination: '4310003',
            }
            const csd2: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*4',
                destination: '4310004',
            }
            it('update customer speed dial *1 -> *3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customerspeeddials/${createdEntries[0]['id']}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...csd1, customer_id: testCustomerId})
                expect(response.status).toEqual(204)
            })
            it('update customer speed dial *2 -> *4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customerspeeddials/${createdEntries[1]['id']}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...csd2, customer_id: testCustomerId})
                expect(response.status).toEqual(204)
            })
            it('read adjusted customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customerspeeddials/?customer_id=${testCustomerId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const csdCollection = response.body
                expect(csdCollection.total_count).toEqual(2)
                const csdEntries: CustomerSpeedDialResponseDto[] = csdCollection.data
                expect(await validate(csdEntries)).toEqual([])
                expect(csdEntries).toHaveLength(2)
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[0].slot).toEqual('*3')
                expect(csdEntries[0].destination).toMatch(RegExp('^sip:4310003@'))
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[1].slot).toEqual('*4')
                expect(csdEntries[1].destination).toMatch(RegExp('^sip:4310004@'))
            })
            it('update non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/customerspeeddials/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...csd1, customer_id: testCustomerId})
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/slot',
                    value: '*5',
                },
                {
                    op: 'replace',
                    path: '/destination',
                    value: '4310005',
                },
            ]
            it('adjust customer speed dial *3 -> *5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customerspeeddials/${createdEntries[0]['id']}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customerspeeddials/?customer_id=${testCustomerId}&slot=%2A5`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const csdCollection = response.body
                expect(csdCollection.total_count).toEqual(1)
                const csdEntries: CustomerSpeedDialResponseDto[] = csdCollection.data
                expect(await validate(csdEntries)).toEqual([])
                expect(csdEntries).toHaveLength(1)
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[0].slot).toEqual('*5')
                expect(csdEntries[0].destination).toMatch(RegExp('^sip:4310005@'))
            })
            it('adjust non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customerspeeddials/999991111112')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('CustomerSpeedDial DELETE', () => {
        it('delete created customer speed dial', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/customerspeeddials/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created journals and fixtures', async () => {
            if (createdIds.length)
                await db.billing.Journal.delete({
                    resource_name: 'customerspeeddials',
                    resource_id: In(createdIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
            if (provisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(provisioningSubscriberId)
            if (testCustomerId)
                await db.billing.Contract.delete(testCustomerId)
            if (provisioningDomainId)
                await db.provisioning.VoipDomain.delete(provisioningDomainId)
            if (billingDomainId)
                await db.billing.Domain.delete(billingDomainId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})