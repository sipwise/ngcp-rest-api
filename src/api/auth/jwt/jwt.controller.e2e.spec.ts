import {inspect} from 'util'

import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {AuthJwtModule} from './jwt.module'

import {AuthTokenCreateResponseDto} from '~/api/auth/tokens/dto/token-create-response'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {LoggerService} from '~/logger/logger.service'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Auth JWT', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let compareSpy: jest.SpyInstance
    let accessToken: string
    let authTokenId: string
    let authToken: string
    const secret = 'e2e-Secret-66545'
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: secret}

    const suffix = `${process.env.JEST_WORKER_ID}x${Date.now()}`
    const domain = `e2e-jwt-${suffix}.invalid`
    // unique client ip per worker/run (X-Real-IP), 198.18.0.0/15 is reserved for benchmarking
    const subscriberIp = `198.19.${process.env.JEST_WORKER_ID}.${Date.now() % 254 + 1}`
    let billingDomainId: number
    let provisioningDomainId: number
    let customerId: number
    let lockAttributeId: number
    const provisioningSubscriberIds: number[] = []

    interface SubscriberLogin {
        role: RbacRole
        username: string
        id?: number
        accessToken?: string
        authTokenId?: string
        authToken?: string
    }

    const subscribers: SubscriberLogin[] = [
        {role: RbacRole.subscriber, username: `e2ejwtsub${suffix}`},
        {role: RbacRole.subscriberadmin, username: `e2ejwtsubadmin${suffix}`},
    ]

    const insertSubscriber = async (username: string, admin: boolean): Promise<number> => {
        const uuid = uuidv4()
        const billingId: number = (await db.billing.VoipSubscriber.insert({
            contract_id: customerId,
            uuid: uuid,
            username: username,
            domain_id: billingDomainId,
            status: VoipSubscriberStatus.Active,
        })).identifiers[0].id
        provisioningSubscriberIds.push((await db.provisioning.VoipSubscriber.insert({
            username: username,
            domain_id: provisioningDomainId,
            uuid: uuid,
            password: uuidv4().slice(0, 16),
            webusername: username,
            webpassword: 'mockSubscriberWebpassword',
            webpassword_modify_timestamp: new Date(),
            admin: admin,
            account_id: customerId,
            ban_increment_stage: 0,
        })).identifiers[0].id)
        return billingId
    }

    const subscriberRequest = (method: 'post' | 'delete', path: string): request.Test =>
        (method == 'post' ? request(app.getHttpServer()).post(path) : request(app.getHttpServer()).delete(path))
            .set('X-Auth-Realm', 'subscriber')
            .set('X-Real-IP', subscriberIp)
            .set('Accept', 'application/json')

    const failedAttempts = async (sub: SubscriberLogin): Promise<number> => {
        const key = `login:fail::user:${sub.username}::domain:${domain}::realm:subscriber::ip:${subscriberIp}`
        return +(await (await authService.getRedisBanDb()).hget(key, 'attempts') || 0)
    }

    const clearFailedAttempts = async (): Promise<void> => {
        for (const sub of subscribers)
            await authService.clearFailedLoginAttempts(sub.username, domain, 'subscriber', subscriberIp)
    }

    const setStatus = async (subscriberStatus: VoipSubscriberStatus, lock: string | null, contractStatus: ContractStatus): Promise<void> => {
        await db.billing.VoipSubscriber.update(subscribers.map(sub => sub.id), {status: subscriberStatus})
        await db.provisioning.VoipUsrPreference.delete({subscriber_id: In(provisioningSubscriberIds), attribute_id: lockAttributeId})
        if (lock != null)
            await db.provisioning.VoipUsrPreference.insert(provisioningSubscriberIds.map(id => ({subscriber_id: id, attribute_id: lockAttributeId, value: lock})))
        await db.billing.Contract.update(customerId, {status: contractStatus})
    }

    const lifetime = (body: {created_at: string, expires_at: string}): number =>
        (new Date(body.expires_at).getTime() - new Date(body.created_at).getTime()) / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthJwtModule, AppModule],
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
        customerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
        lockAttributeId = (await db.provisioning.VoipPreference.findOneByOrFail({attribute: 'lock'})).id
        for (const sub of subscribers)
            sub.id = await insertSubscriber(sub.username, sub.role == RbacRole.subscriberadmin)
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
        compareSpy = jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
        expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
    })

    describe('', () => { // main tests block
        describe('POST credentials', () => {
            it('login with credentials in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(creds)
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
                expect(lifetime(response.body)).toEqual(appService.config.common.jwt_default_ttl)
                expect(JSON.stringify(response.body)).not.toContain(secret)
                accessToken = response.body.access_token
            })

            it('login with credentials and expires_in in the JSON body', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...creds, expires_in: 600})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(600)
            })

            it('login with basic auth', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
            })

            it('login with basic auth and expires_in', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({expires_in: 900})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(900)
            })

            it('reject wrong password in the JSON body', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(creds)
                expect(response.status).toEqual(401)
            })

            it('reject wrong password with basic auth', async () => {
                compareSpy.mockResolvedValueOnce(false)
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })

            it('reset failed login attempts by a successful login', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(creds)
                expect(response.status).toEqual(201)
            })

            it('reject credentials in the query string without logging the password', async () => {
                const logSpy = jest.spyOn(LoggerService.prototype, 'log')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .query(creds)
                    expect(response.status).toEqual(401)
                    expect(response.body.path).toContain('password=********')
                    expect(JSON.stringify(response.body)).not.toContain(secret)
                    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({message: 'RESPONSE'}))
                    expect(inspect(logSpy.mock.calls, {depth: null})).not.toContain(secret)
                } finally {
                    logSpy.mockRestore()
                }
            })

            it('reject unknown property without echoing the password', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...creds, foo: 'bar'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body)).toContain('foo')
                expect(JSON.stringify(response.body)).not.toContain(secret)
            })

            it('do not log the password on validation errors', async () => {
                const debugSpy = jest.spyOn(LoggerService.prototype, 'debug')
                try {
                    const response = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({...creds, expires_in: 0})
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body)).not.toContain(secret)
                    expect(debugSpy).toHaveBeenCalledWith(expect.objectContaining({message: 'input validation failed'}))
                    expect(inspect(debugSpy.mock.calls, {depth: null})).not.toContain(secret)
                } finally {
                    debugSpy.mockRestore()
                }
            })
        })

        describe('POST bearer', () => {
            it('renew with an access token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({expires_in: 300})
                expect(response.status).toEqual(201)
                expect(lifetime(response.body)).toEqual(300)
            })

            it('create an auth token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/tokens')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({identifier: 'test_jwt_exchange', expires_in: 3600})
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body.data[0]
                authTokenId = created.id
                authToken = created.auth_token
            })

            it('exchange an auth token', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(201)
                expect(response.body.access_token).toBeDefined()
            })
        })

        describe.each(subscribers)('subscriber status ($role)', sub => {
            it('login with basic auth and create an auth token', async () => {
                const login = await subscriberRequest('post', '/api/auth/jwt')
                    .auth(`${sub.username}@${domain}`, secret)
                expect(login.status).toEqual(201)
                sub.accessToken = login.body.access_token
                const response = await subscriberRequest('post', '/api/auth/tokens')
                    .set('Authorization', `Bearer ${sub.accessToken}`)
                    .set('Content-Type', 'application/json')
                    .send({identifier: `test_jwt_status_${suffix}`, expires_in: 3600})
                expect(response.status).toEqual(201)
                const created: AuthTokenCreateResponseDto = response.body.data[0]
                sub.authTokenId = created.id
                sub.authToken = created.auth_token
            })

            it.each([
                [VoipSubscriberStatus.Locked, '3', ContractStatus.Active],
                [VoipSubscriberStatus.Active, '2', ContractStatus.Active],
            ])('accept subscriber status %s, lock %s, customer status %s', async (subscriberStatus, lock, contractStatus) => {
                await setStatus(subscriberStatus, lock, contractStatus)
                try {
                    const basic = await subscriberRequest('post', '/api/auth/jwt')
                        .auth(`${sub.username}@${domain}`, secret)
                    expect(basic.status).toEqual(201)

                    const renew = await subscriberRequest('post', '/api/auth/jwt')
                        .set('Authorization', `Bearer ${sub.accessToken}`)
                    expect(renew.status).toEqual(201)

                    const exchange = await subscriberRequest('post', '/api/auth/jwt')
                        .set('Authorization', `Bearer ${sub.authToken}`)
                    expect(exchange.status).toEqual(201)
                } finally {
                    await setStatus(VoipSubscriberStatus.Active, null, ContractStatus.Active)
                }
            })

            it.each([
                [VoipSubscriberStatus.Locked, '4', ContractStatus.Active],
                [VoipSubscriberStatus.Active, '4', ContractStatus.Active],
                [VoipSubscriberStatus.Active, null, ContractStatus.Locked],
                [VoipSubscriberStatus.Active, null, ContractStatus.Pending],
                [VoipSubscriberStatus.Active, null, ContractStatus.Terminated],
            ])('reject subscriber status %s, lock %s, customer status %s', async (subscriberStatus, lock, contractStatus) => {
                await setStatus(subscriberStatus, lock, contractStatus)
                try {
                    const basic = await subscriberRequest('post', '/api/auth/jwt')
                        .auth(`${sub.username}@${domain}`, secret)
                    expect(basic.status).toEqual(401)
                    expect(basic.body.errorCode).toEqual('UNAUTHORIZED')
                    expect(await failedAttempts(sub)).toEqual(1)

                    const body = await subscriberRequest('post', '/api/auth/jwt')
                        .set('Content-Type', 'application/json')
                        .send({username: `${sub.username}@${domain}`, password: secret})
                    expect(body.status).toEqual(401)

                    const tokens = await subscriberRequest('post', '/api/auth/tokens')
                        .auth(`${sub.username}@${domain}`, secret)
                        .set('Content-Type', 'application/json')
                        .send({identifier: `test_jwt_status_${suffix}`, expires_in: 3600})
                    expect(tokens.status).toEqual(401)

                    const renew = await subscriberRequest('post', '/api/auth/jwt')
                        .set('Authorization', `Bearer ${sub.accessToken}`)
                    expect(renew.status).toEqual(401)

                    const exchange = await subscriberRequest('post', '/api/auth/jwt')
                        .set('Authorization', `Bearer ${sub.authToken}`)
                    expect(exchange.status).toEqual(401)
                } finally {
                    await setStatus(VoipSubscriberStatus.Active, null, ContractStatus.Active)
                    await clearFailedAttempts()
                }
            })

            it('accept the tokens again once active', async () => {
                const renew = await subscriberRequest('post', '/api/auth/jwt')
                    .set('Authorization', `Bearer ${sub.accessToken}`)
                expect(renew.status).toEqual(201)
                const exchange = await subscriberRequest('post', '/api/auth/jwt')
                    .set('Authorization', `Bearer ${sub.authToken}`)
                expect(exchange.status).toEqual(201)
            })
        })
    })

    describe('Auth JWT DELETE', () => {
        it('delete the auth token', async () => {
            if (!authTokenId)
                return
            const response = await request(app.getHttpServer())
                .delete(`/api/auth/tokens/${authTokenId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('Accept', 'application/json')
            expect(response.status).toEqual(204)
        })

        it('delete the subscriber auth tokens', async () => {
            await setStatus(VoipSubscriberStatus.Active, null, ContractStatus.Active)
            for (const sub of subscribers.filter(sub => sub.authTokenId)) {
                const response = await subscriberRequest('delete', `/api/auth/tokens/${sub.authTokenId}`)
                    .set('Authorization', `Bearer ${sub.accessToken}`)
                expect(response.status).toEqual(204)
            }
        })

        it('delete subscriber fixtures', async () => {
            await clearFailedAttempts()
            if (provisioningSubscriberIds.length)
                await db.provisioning.VoipSubscriber.delete(provisioningSubscriberIds)
            if (customerId)
                await db.billing.Contract.delete(customerId)
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
