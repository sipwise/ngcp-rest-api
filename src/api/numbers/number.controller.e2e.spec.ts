import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {v4 as uuidv4} from 'uuid'

import {NumberResponseDto} from './dto/number-response.dto'
import {NumberModule} from './number.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let domain: string
    let billingDomainId: number
    let provisioningDomainId: number
    let customerId: number
    let billingSubscriberId: number
    let provisioningSubscriberId: number
    let dbAliasId: number
    let numberId: number
    const suffix = `${process.env.JEST_WORKER_ID}x${Date.now()}`
    const cc = 999
    const ac = `9${process.env.JEST_WORKER_ID}`
    const sn = `${Date.now()}`
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const resellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    let otherResellerContractId: number
    let otherResellerId: number
    let resellerHeader: [string, string]

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NumberModule, AppModule],
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

        domain = `e2e-number-${suffix}.invalid`
        const username = `e2enumber${suffix}`
        const uuid = uuidv4()
        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id
        customerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
        billingSubscriberId = (await db.billing.VoipSubscriber.insert({
            contract_id: customerId,
            uuid: uuid,
            username: username,
            domain_id: billingDomainId,
            status: 'active',
        })).identifiers[0].id
        provisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
            username: username,
            domain_id: provisioningDomainId,
            uuid: uuid,
            password: uuidv4().slice(0, 16),
            webusername: username,
            webpassword: 'mockSubscriberWebpassword',
            webpassword_modify_timestamp: new Date(),
            admin: false,
            account_id: customerId,
            ban_increment_stage: 0,
        })).identifiers[0].id
        numberId = (await db.billing.VoipNumber.insert({
            cc: cc,
            ac: ac,
            sn: sn,
            reseller_id: 1,
            subscriber_id: billingSubscriberId,
        })).identifiers[0].id
        dbAliasId = (await db.provisioning.VoipDBAlias.insert({
            username: `${cc}${ac}${sn}`,
            domain_id: provisioningDomainId,
            subscriber_id: provisioningSubscriberId,
            is_primary: true,
            is_devid: false,
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
        describe('GET', () => {
            it('read numbers filtered by sn', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/numbers?sn=${sn}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                const numbers: NumberResponseDto[] = response.body.data
                expect(numbers).toHaveLength(1)
                expect(numbers[0].id).toEqual(numberId)
                expect(await validate(numbers)).toEqual([])
            })

            it('read number by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/numbers/${numberId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const number: NumberResponseDto = response.body
                expect(number).toMatchObject({
                    id: numberId,
                    cc: cc,
                    ac: ac,
                    sn: sn,
                    subscriber_id: billingSubscriberId,
                    customer_id: customerId,
                    reseller_id: 1,
                    is_primary: true,
                    is_devid: false,
                })
                expect(await validate(number)).toEqual([])
            })

            it('return 404 for a non-existing number', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/numbers/2147483647')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('reseller scope', () => {
            it('create another reseller and log in as its reseller admin', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId, name: `number_reseller_${suffix}`, status: ResellerStatus.Active,
                }).save()).id
                await db.billing.Admin.delete({login: resellerCreds.username})
                const resellerRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.reseller})
                await db.billing.Admin.insert({
                    reseller_id: otherResellerId,
                    login: resellerCreds.username,
                    saltedpass: 'mockAdminSaltedpass',
                    saltedpass_modify_timestamp: now,
                    role_id: resellerRole.id,
                    is_master: true,
                    is_superuser: false,
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
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(resellerCreds)
                expect(response.status).toEqual(201)
                resellerHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
            })

            it('list no numbers of another reseller filtered by its reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/numbers?reseller_id=1&sn=${sn}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })

            it('list no numbers of another reseller with search_or', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/numbers?search_or=1&sn=${sn}&cc=${cc}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })

            it('not read a number of another reseller with search_or', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/numbers/${numberId}?search_or=1&sn=${sn}&cc=${cc}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Numbers DELETE', () => {
        it('delete fixtures and mock admin', async () => {
            if (dbAliasId)
                await db.provisioning.VoipDBAlias.delete(dbAliasId)
            if (numberId)
                await db.billing.VoipNumber.delete(numberId)
            if (provisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(provisioningSubscriberId)
            if (billingSubscriberId)
                await db.billing.VoipSubscriber.delete(billingSubscriberId)
            if (customerId)
                await db.billing.Contract.delete(customerId)
            if (provisioningDomainId)
                await db.provisioning.VoipDomain.delete(provisioningDomainId)
            if (billingDomainId)
                await db.billing.Domain.delete(billingDomainId)
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: resellerCreds.username})
        })
    })
})
