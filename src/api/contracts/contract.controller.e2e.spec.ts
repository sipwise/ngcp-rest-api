import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {ContractModule} from './contract.module'
import {ContractResponseDto} from './dto/contract-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus, ContractType} from '~/entities/internal/contract.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

// seed rows: system contact (no reseller), customer contact of reseller 1, billing profile, product of class 'reseller'
const SYSTEM_CONTACT_ID = 2
const CUSTOMER_CONTACT_ID = 1
const BILLING_PROFILE_ID = 1
const RESELLER_PRODUCT_ID = 3

type ContractPost = {
    contact_id: number
    billing_profile_id: number
    external_id?: string
    status: ContractStatus
    type: ContractType
}

describe('Contract', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    let profileId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const prefix = `test_contract_${process.env.JEST_WORKER_ID}_${Date.now()}`

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ContractModule, AppModule],
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

        const profile = await db.billing.BillingProfile.create({
            reseller_id: 1,
            handle: `${prefix}_profile`,
            name: `${prefix}_profile`.substring(0, 31),
            currency: 'EUR',
        }).save()
        profileId = profile.id
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
            it('create contracts', async () => {
                const contracts: ContractPost[] = [
                    {
                        contact_id: SYSTEM_CONTACT_ID,
                        billing_profile_id: BILLING_PROFILE_ID,
                        external_id: `${prefix}_1`,
                        status: ContractStatus.Active,
                        type: ContractType.Reseller,
                    },
                    {
                        contact_id: SYSTEM_CONTACT_ID,
                        billing_profile_id: BILLING_PROFILE_ID,
                        external_id: `${prefix}_2`,
                        status: ContractStatus.Pending,
                        type: ContractType.SipPeering,
                    },
                ]
                const response = await request(app.getHttpServer())
                    .post('/api/contracts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(contracts)
                expect(response.status).toEqual(201)
                expect(response.body.data).toHaveLength(2)
                for (const contract of response.body.data)
                    createdIds.push(+contract.id)
                const created: ContractResponseDto = response.body.data[0]
                expect(created.contact_id).toEqual(SYSTEM_CONTACT_ID)
                expect(created.external_id).toEqual(`${prefix}_1`)
                expect(created.status).toEqual(ContractStatus.Active)
                expect(created.type).toEqual(ContractType.Reseller)
                expect(response.body.data[1].type).toEqual(ContractType.SipPeering)
            })
            it('create contract with its billing profile', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contracts?external_id=${prefix}_*`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.data.map((c: ContractResponseDto) => c.billing_profile_id))
                    .toEqual([BILLING_PROFILE_ID, BILLING_PROFILE_ID])
            })
            it('fail create contract with a customer contact', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/contracts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        contact_id: CUSTOMER_CONTACT_ID,
                        billing_profile_id: BILLING_PROFILE_ID,
                        status: ContractStatus.Active,
                        type: ContractType.Reseller,
                    })
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read contracts collection', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contracts?external_id=${prefix}_*&order_by=id`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                expect(response.body.data.map((c: ContractResponseDto) => c.id)).toEqual(createdIds)
                expect(response.body.data.map((c: ContractResponseDto) => c.type))
                    .toEqual([ContractType.Reseller, ContractType.SipPeering])
            })
            it('read contract', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/contracts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const contract: ContractResponseDto = response.body
                expect(await validate(contract)).toEqual([])
                expect(contract.external_id).toEqual(`${prefix}_1`)
                expect(contract.type).toEqual(ContractType.Reseller)
            })
            it('read non-existing contract', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/contracts/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update contract', async () => {
                const update: ContractPost = {
                    contact_id: SYSTEM_CONTACT_ID,
                    billing_profile_id: BILLING_PROFILE_ID,
                    external_id: `${prefix}_1_put`,
                    status: ContractStatus.Locked,
                    type: ContractType.Reseller,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/contracts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(update)
                expect(response.status).toEqual(200)
                const contract: ContractResponseDto = response.body
                expect(contract.id).toEqual(createdIds[0])
                expect(contract.external_id).toEqual(`${prefix}_1_put`)
                expect(contract.status).toEqual(ContractStatus.Locked)
                expect(contract.type).toEqual(ContractType.Reseller)
            })
            it('update contracts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/contracts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[0]]: {
                            contact_id: SYSTEM_CONTACT_ID,
                            billing_profile_id: profileId,
                            external_id: `${prefix}_1_bulk`,
                            status: ContractStatus.Locked,
                            type: ContractType.Reseller,
                        },
                        [createdIds[1]]: {
                            contact_id: SYSTEM_CONTACT_ID,
                            billing_profile_id: BILLING_PROFILE_ID,
                            external_id: `${prefix}_2_bulk`,
                            status: ContractStatus.Active,
                            type: ContractType.SipPeering,
                        },
                    })
                expect(response.status).toEqual(204)
                const contract = await db.billing.Contract.findOneByOrFail({id: createdIds[0]})
                expect(contract.external_id).toEqual(`${prefix}_1_bulk`)
                expect(contract.status).toEqual(ContractStatus.Locked)
                expect(contract.product_id).toEqual(RESELLER_PRODUCT_ID)
                expect((await db.billing.Contract.findOneByOrFail({id: createdIds[1]})).status).toEqual(ContractStatus.Active)
                const read = await request(app.getHttpServer())
                    .get(`/api/contracts?external_id=${prefix}_*&order_by=id`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(read.status).toEqual(200)
                expect(read.body.data.map((c: ContractResponseDto) => c.billing_profile_id)).toEqual([profileId, BILLING_PROFILE_ID])
            })
            it('clear external_id with update', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/contracts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[1]]: {
                            contact_id: SYSTEM_CONTACT_ID,
                            billing_profile_id: BILLING_PROFILE_ID,
                            status: ContractStatus.Active,
                            type: ContractType.SipPeering,
                        },
                    })
                expect(response.status).toEqual(204)
                expect((await db.billing.Contract.findOneByOrFail({id: createdIds[1]})).external_id).toBeNull()
            })
        })

        describe('PATCH', () => {
            it('adjust contract', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/contracts/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/external_id', value: `${prefix}_1_patch`}])
                expect(response.status).toEqual(200)
                const contract: ContractResponseDto = response.body
                expect(contract.external_id).toEqual(`${prefix}_1_patch`)
                expect(contract.status).toEqual(ContractStatus.Locked)
                expect(contract.type).toEqual(ContractType.Reseller)
            })
            it('adjust contracts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/contracts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/status', value: ContractStatus.Active}],
                        [createdIds[1]]: [{op: 'replace', path: '/status', value: ContractStatus.Locked}],
                    })
                expect(response.status).toEqual(204)
                const contracts = await db.billing.Contract.findBy({id: In(createdIds)})
                const first = contracts.find(c => c.id == createdIds[0])
                expect(first.status).toEqual(ContractStatus.Active)
                expect(first.product_id).toEqual(RESELLER_PRODUCT_ID)
                expect(contracts.find(c => c.id == createdIds[1]).status).toEqual(ContractStatus.Locked)
            })
        })
    })

    describe('Contract DELETE', () => {
        it('delete created journals', async () => {
            if (createdIds.length)
                await db.billing.Journal.delete({resource_name: 'contracts', resource_id: In(createdIds)})
        })
        it('delete created contracts', async () => {
            // their billing mappings are deleted with them
            if (createdIds.length)
                await db.billing.Contract.delete(createdIds)
            if (profileId)
                await db.billing.BillingProfile.delete(profileId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
