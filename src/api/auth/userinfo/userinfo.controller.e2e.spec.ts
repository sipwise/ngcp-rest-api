import {randomUUID} from 'crypto'

import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'

import {AuthUserinfoModule} from './userinfo.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ExpandInterceptor} from '~/interceptors/expand.interceptor'
import {LazyFieldInterceptor} from '~/interceptors/lazy-field.interceptor'
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
    let adminId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const goneLogin = `mockGoneAdmin${process.env.JEST_WORKER_ID}${Date.now()}`
    const certSerial = Date.now() * 100 + Number(process.env.JEST_WORKER_ID)
    const tzSuffix = `${process.env.JEST_WORKER_ID}_${Date.now()}`
    const tzResellerLogin = `mockResellerUser${process.env.JEST_WORKER_ID}`
    let tzContactId: number
    let tzContractId: number
    let tzResellerId: number
    const tzDomain = `e2e-tz-${tzSuffix.replace('_', '-')}.example.org`
    const tz: {
        customerContactId?: number
        subscriberContactId?: number
        customerId?: number
        billingDomainId?: number
        provisioningDomainId?: number
        subscriberId?: number
        webusername?: string
    } = {}
    // the password time of the logins, within the password max age
    const modified = new Date(Math.floor(Date.now() / 1000) * 1000 - 86400 * 1000)

    function zoned(date: Date, zone: string): string {
        return Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(zone)
            .toString({timeZoneName: 'never', fractionalSecondDigits: 3})
    }

    async function userinfo(auth: [string, string], query = ''): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/api/auth/userinfo${query}`)
            .set(...auth)
            .set('Accept', 'application/json')
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthUserinfoModule, AppModule],
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
            app.get(LazyFieldInterceptor),
            new TransactionInterceptor(app.get(Reflector)),
            new ResponseValidationInterceptor(),
            app.get(ExpandInterceptor),
        )
        app.use(bodyParser.json({
            type: ['application/json-patch+json', 'application/json'],
        }))
        app.getHttpAdapter().getInstance().disable('x-powered-by')
        app.getHttpAdapter().getInstance().set('json spaces', 2)

        await app.init()

        await db.billing.Admin.delete({login: creds.username})
        const adminRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.admin})
        const result = await db.billing.Admin.insert({
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
            ssl_client_m_serial: certSerial,
        })
        adminId = result.identifiers[0].id
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
            it('read auth/userinfo', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.username).toEqual(creds.username)
                expect(response.body.role).toEqual('admin')
                expect(response.body.id).toEqual(adminId)
            })

            it('not expose the otp secret', async () => {
                await db.billing.Admin.update(adminId, {otp_secret: 'MOCKOTPSECRETE2E'})
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('Authorization', 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'))
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body).not.toHaveProperty('otp_secret_key')
                expect(JSON.stringify(response.body)).not.toContain('MOCKOTPSECRETE2E')
            })

            it('reject the token of a deleted admin', async () => {
                const admin = await db.billing.Admin.findOneByOrFail({id: adminId})
                await db.billing.Admin.insert({...admin, id: undefined, login: goneLogin, otp_secret: null, ssl_client_m_serial: null})
                const jwt = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({username: goneLogin, password: creds.password})
                expect(jwt.status).toEqual(201)
                await db.billing.Admin.delete({login: goneLogin})
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('Authorization', 'Bearer ' + jwt.body['access_token'])
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })

            it('read auth/userinfo with a client certificate serial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('x-ssl-client-serial', certSerial.toString(16))
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(adminId)
                expect(response.body.role).toEqual('admin')
            })

            it.each([
                ['an unknown', '1fffffffffffff'],
                ['an invalid', 'zz'],
            ])('reject %s client certificate serial', async (_name, serial) => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('x-ssl-client-serial', serial)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })

            it('reject the client certificate serial of an inactive admin', async () => {
                await db.billing.Admin.update(adminId, {is_active: false})
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('x-ssl-client-serial', certSerial.toString(16))
                    .set('Accept', 'application/json')
                await db.billing.Admin.update(adminId, {is_active: true})
                expect(response.status).toEqual(403)
            })

            describe('tz', () => {
                let resellerAuth: [string, string]

                it('render the password time of an admin without reseller in the platform timezone', async () => {
                    await db.billing.Admin.update(adminId, {reseller_id: null, saltedpass_modify_timestamp: modified})
                    const response = await userinfo(authHeader)
                    await db.billing.Admin.update(adminId, {reseller_id: 1})
                    expect(response.status).toEqual(200)
                    const value: string = response.body.password_modified_timestamp
                    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000[+-]\d{2}:\d{2}$/)
                    expect(new Date(value).getTime()).toEqual(modified.getTime())
                    // the e2e run has TZ = the DB host's zone, the platform zone
                    expect(value).toEqual(zoned(modified, Temporal.Now.timeZoneId()))
                })

                it('render the password time of a reseller admin in the reseller contact\'s timezone', async () => {
                    const now = new Date()
                    tzContactId = (await db.billing.Contact.create({
                        email: `tz_reseller_${tzSuffix}@example.org`, timezone: 'America/New_York', create_timestamp: now,
                    }).save()).id
                    tzContractId = (await db.billing.Contract.create({
                        contact_id: tzContactId, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                    }).save()).id
                    tzResellerId = (await db.billing.Reseller.create({
                        contract_id: tzContractId, name: `tz_reseller_${tzSuffix}`, status: ResellerStatus.Active,
                    }).save()).id
                    const admin = await db.billing.Admin.findOneByOrFail({id: adminId})
                    const resellerRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.reseller})
                    await db.billing.Admin.delete({login: tzResellerLogin})
                    await db.billing.Admin.insert({
                        ...admin, id: undefined, login: tzResellerLogin, reseller_id: tzResellerId, role_id: resellerRole.id,
                        is_superuser: false, otp_secret: null, ssl_client_m_serial: null, saltedpass_modify_timestamp: modified,
                    })
                    resellerAuth = ['Authorization', 'Basic ' + Buffer.from(`${tzResellerLogin}:${creds.password}`).toString('base64')]
                    const response = await userinfo(resellerAuth)
                    expect(response.status).toEqual(200)
                    expect(response.body.password_modified_timestamp).toEqual(zoned(modified, 'America/New_York'))
                })

                it.each([
                    ['UTC', 'UTC', /Z$/],
                    ['Asia/Tokyo', 'Asia/Tokyo', /\+09:00$/],
                    ['asia/kathmandu', 'Asia/Kathmandu', /\+05:45$/],
                ])('render the password time with tz=%s', async (tz, zone, suffix) => {
                    const response = await userinfo(resellerAuth, `?tz=${tz}`)
                    expect(response.status).toEqual(200)
                    const value: string = response.body.password_modified_timestamp
                    expect(value).toMatch(suffix)
                    expect(new Date(value).getTime()).toEqual(modified.getTime())
                    if (zone != 'UTC')
                        expect(value).toEqual(zoned(modified, zone))
                    else
                        expect(value).toEqual(modified.toISOString())
                })

                it('fall back to the user\'s timezone with tz=owner', async () => {
                    const response = await userinfo(resellerAuth, '?tz=owner')
                    expect(response.status).toEqual(200)
                    expect(response.body.password_modified_timestamp).toEqual(zoned(modified, 'America/New_York'))
                })

                it.each([
                    'localtime',
                    'SYSTEM',
                    'Mars/Base',
                ])('use the platform timezone for the stored timezone %s', async (stored) => {
                    await db.billing.Contact.update(tzContactId, {timezone: stored})
                    const response = await userinfo(resellerAuth)
                    await db.billing.Contact.update(tzContactId, {timezone: 'America/New_York'})
                    expect(response.status).toEqual(200)
                    expect(response.body.password_modified_timestamp).toEqual(zoned(modified, Temporal.Now.timeZoneId()))
                })

                it('render the password time of a subscriber along subscriber, customer and reseller contact', async () => {
                    const now = new Date()
                    tz.customerContactId = (await db.billing.Contact.create({
                        reseller_id: tzResellerId, email: `tz_customer_${tzSuffix}@example.org`, timezone: 'Australia/Sydney', create_timestamp: now,
                    }).save()).id
                    tz.subscriberContactId = (await db.billing.Contact.create({
                        reseller_id: tzResellerId, email: `tz_subscriber_${tzSuffix}@example.org`, timezone: 'Asia/Tokyo', create_timestamp: now,
                    }).save()).id
                    tz.customerId = (await db.billing.Contract.create({
                        contact_id: tz.customerContactId, product_id: 4, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                    }).save()).id
                    tz.billingDomainId = (await db.billing.Domain.create({domain: tzDomain, reseller_id: tzResellerId}).save()).id
                    tz.provisioningDomainId = (await db.provisioning.VoipDomain.create({domain: tzDomain}).save()).id
                    const uuid = randomUUID()
                    const username = `tzsub${tzSuffix}`
                    tz.webusername = `w${username}`
                    tz.subscriberId = (await db.billing.VoipSubscriber.insert({
                        contract_id: tz.customerId, uuid, username, domain_id: tz.billingDomainId,
                        status: VoipSubscriberStatus.Active, contact_id: tz.subscriberContactId,
                    })).identifiers[0].id
                    await db.provisioning.VoipSubscriber.insert({
                        username, domain_id: tz.provisioningDomainId, uuid, password: randomUUID().slice(0, 16),
                        webusername: tz.webusername, webpassword: 'mockSubscriberWebpassword',
                        webpassword_modify_timestamp: modified, account_id: tz.customerId,
                    })
                    const subscriberAuth = async (): Promise<request.Response> => request(app.getHttpServer())
                        .get('/api/auth/userinfo')
                        .auth(`${tz.webusername}@${tzDomain}`, 'mockSubscriberWebpassword')
                        .set('X-Auth-Realm', 'subscriber')
                        .set('Accept', 'application/json')

                    const bySubscriber = await subscriberAuth()
                    expect(bySubscriber.status).toEqual(200)
                    expect(bySubscriber.body.password_modified_timestamp).toEqual(zoned(modified, 'Asia/Tokyo'))
                    await db.billing.Contact.update(tz.subscriberContactId, {timezone: null})
                    const byCustomer = await subscriberAuth()
                    expect(byCustomer.body.password_modified_timestamp).toEqual(zoned(modified, 'Australia/Sydney'))
                    await db.billing.Contact.update(tz.customerContactId, {timezone: null})
                    const byReseller = await subscriberAuth()
                    expect(byReseller.body.password_modified_timestamp).toEqual(zoned(modified, 'America/New_York'))
                })

                it.each([
                    'Mars/Base',
                    '%2B01:00',
                    '',
                ])('reject tz=%s with 400', async (tz) => {
                    const response = await userinfo(resellerAuth, `?tz=${tz}`)
                    expect(response.status).toEqual(400)
                    expect(response.body.errors).toEqual([expect.objectContaining({parameter: 'tz', code: 'INVALID_TIMEZONE'})])
                })
            })

            it('reject auth/userinfo without credentials', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })
        })
    })

    describe('Auth Userinfo DELETE', () => {
        it('delete mock admin', async () => {
            if (tz.webusername)
                await db.provisioning.VoipSubscriber.delete({webusername: tz.webusername})
            if (tz.subscriberId)
                await db.billing.VoipSubscriber.delete(tz.subscriberId)
            if (tz.customerId)
                await db.billing.Contract.delete(tz.customerId)
            for (const id of [tz.subscriberContactId, tz.customerContactId].filter(Boolean))
                await db.billing.Contact.delete(id)
            if (tz.billingDomainId)
                await db.billing.Domain.delete(tz.billingDomainId)
            if (tz.provisioningDomainId)
                await db.provisioning.VoipDomain.delete(tz.provisioningDomainId)
            await db.billing.Admin.delete({login: tzResellerLogin})
            if (tzContractId)
                await db.billing.Contract.delete(tzContractId)
            if (tzContactId)
                await db.billing.Contact.delete(tzContactId)
            await db.billing.Admin.delete({login: goneLogin})
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})