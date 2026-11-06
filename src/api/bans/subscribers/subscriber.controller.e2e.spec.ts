import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {BanSubscriberModule} from './subscriber.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Ban Subscribers', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let billingDomainId: number
    let provisioningDomainId: number
    let customerId: number
    let readerId: number
    let bannedSubscriberId: number
    let resellerId: number
    const provisioningSubscriberIds: number[] = []
    const password = 'mockSubscriberPass'
    const startedAt = Date.now() / 1000
    const suffix = `${process.env.JEST_WORKER_ID}x${Date.now()}`
    const domain = `e2e-ban-${suffix}.invalid`
    const readerUsername = `e2ebanreader${suffix}`
    const bannedUsername = `e2ebanned${suffix}`
    // unique client ip per worker/run (X-Real-IP), 198.18.0.0/15 is reserved for benchmarking
    const bannedIp = `198.18.${process.env.JEST_WORKER_ID}.${Date.now() % 254 + 1}`
    const keySuffix = `::user:${bannedUsername}::domain:${domain}::realm:subscriber::ip:${bannedIp}`
    const failKey = `login:fail${keySuffix}`
    let banKey: string

    // subscriberadmin of the same customer, reads and deletes the ban
    const requestAsReader = (method: 'get' | 'delete', path: string): request.Test =>
        (method == 'get' ? request(app.getHttpServer()).get(path) : request(app.getHttpServer()).delete(path))
            .auth(`${readerUsername}@${domain}`, password)
            .set('X-Auth-Realm', 'subscriber')
            .set('Accept', 'application/json')

    const requestAsBannedSubscriber = (pass: string): request.Test =>
        request(app.getHttpServer())
            .get('/api/auth/userinfo')
            .auth(`${bannedUsername}@${domain}`, pass)
            .set('X-Auth-Realm', 'subscriber')
            .set('X-Real-IP', bannedIp)
            .set('Accept', 'application/json')

    const insertSubscriber = async (username: string, admin: boolean): Promise<number> => {
        const uuid = uuidv4()
        const billingId: number = (await db.billing.VoipSubscriber.insert({
            contract_id: customerId,
            uuid: uuid,
            username: username,
            domain_id: billingDomainId,
            status: 'active',
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

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BanSubscriberModule, AppModule],
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

        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id
        customerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
        resellerId = (await db.billing.Contact.findOneByOrFail({id: 1})).reseller_id
        readerId = await insertSubscriber(readerUsername, true)
        bannedSubscriberId = await insertSubscriber(bannedUsername, false)
        banKey = `login:ban${keySuffix}::subscriber_id:${bannedSubscriberId}::customer_id:${customerId}`
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
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async (pass: string) => pass === password)
        expect(await authService.compareBcryptPassword(password, 'hash')).toBe(true)
        expect(await authService.compareBcryptPassword('wrongPass', 'hash')).toBe(false)
    })

    describe('', () => { // main tests block
        describe('ban by failed logins', () => {
            it('count failed login attempts', async () => {
                const redis = await authService.getRedisBanDb()
                for (let attempt = 1; attempt < AppService.config.security.login.max_attempts; attempt++) {
                    const response = await requestAsBannedSubscriber('wrongPass')
                    expect(response.status).toEqual(401)
                    expect(await redis.hget(failKey, 'attempts')).toEqual(`${attempt}`)
                }
            })

            it('ban the subscriber at max_attempts failed logins', async () => {
                const response = await requestAsBannedSubscriber('wrongPass')
                expect(response.status).toEqual(401)
                const redis = await authService.getRedisBanDb()
                expect(await redis.exists(failKey)).toEqual(0)
                expect(await redis.hget(banKey, 'banned_at')).toBeTruthy()
                const subscriber = await db.provisioning.VoipSubscriber.findOneByOrFail({webusername: bannedUsername})
                expect(subscriber.ban_increment_stage).toEqual(1)
                expect(subscriber.last_banned_ip).toEqual(bannedIp)
            })

            it('reject the banned subscriber with 403', async () => {
                const response = await requestAsBannedSubscriber(password)
                expect(response.status).toEqual(403)
                expect(response.body.message).toEqual('Banned')
            })
        })

        describe('GET', () => {
            it('read banned subscribers filtered by username', async () => {
                const response = await requestAsReader('get', `/api/bans/subscribers?username=${bannedUsername}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                expect(response.body.data).toEqual([{
                    id: bannedSubscriberId,
                    reseller_id: resellerId,
                    username: bannedUsername,
                    ban_increment_stage: 1,
                    last_banned_ip: bannedIp,
                    last_banned_at: expect.any(String),
                }])
            })

            it('read banned subscriber by id', async () => {
                const response = await requestAsReader('get', `/api/bans/subscribers/${bannedSubscriberId}`)
                expect(response.status).toEqual(200)
                expect(response.body).toEqual({
                    id: bannedSubscriberId,
                    reseller_id: resellerId,
                    username: bannedUsername,
                    ban_increment_stage: 1,
                    last_banned_ip: bannedIp,
                    last_banned_at: expect.any(String),
                })
            })

            it('read subscriber that is not banned returns 404', async () => {
                const response = await requestAsReader('get', `/api/bans/subscribers/${readerId}`)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Ban Subscribers DELETE', () => {
        it('delete subscriber ban', async () => {
            const response = await requestAsReader('delete', `/api/bans/subscribers/${bannedSubscriberId}`)
                .set('Content-Type', 'application/json')
            expect(response.status).toEqual(204)
            expect(await (await authService.getRedisBanDb()).exists(banKey)).toEqual(0)
            const subscriber = await db.provisioning.VoipSubscriber.findOneByOrFail({webusername: bannedUsername})
            expect(subscriber.ban_increment_stage).toEqual(0)
        })

        it('allow the subscriber again after the ban is deleted', async () => {
            const response = await requestAsBannedSubscriber(password)
            expect(response.status).toEqual(200)
            expect(response.body.username).toEqual(bannedUsername)
        })

        it('delete fixtures and journals', async () => {
            const redis = await authService.getRedisBanDb()
            await redis.del(failKey)
            if (banKey)
                await redis.del(banKey)
            if (bannedSubscriberId)
                await db.billing.Journal.delete({
                    resource_name: 'bans/subscribers',
                    resource_id: bannedSubscriberId,
                    timestamp: MoreThanOrEqual(startedAt),
                })
            if (provisioningSubscriberIds.length)
                await db.provisioning.VoipSubscriber.delete(provisioningSubscriberIds)
            if (customerId)
                await db.billing.Contract.delete(customerId)
            if (provisioningDomainId)
                await db.provisioning.VoipDomain.delete(provisioningDomainId)
            if (billingDomainId)
                await db.billing.Domain.delete(billingDomainId)
        })
    })
})
