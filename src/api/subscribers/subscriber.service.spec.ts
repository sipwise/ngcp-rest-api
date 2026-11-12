import {ForbiddenException, NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'
import {I18nService} from 'nestjs-i18n'

import {SubscriberCustomer} from './interfaces/subscriber.repository'
import {SubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {SubscriberMockRepository} from './repositories/subscriber.mock.repository'
import {SubscriberRedisMockRepository} from './repositories/subscriber.redis.mock.repository'
import {SubscriberRedisRepository} from './repositories/subscriber.redis.repository'
import {SubscriberService} from './subscriber.service'

import {AppService} from '~/app.service'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {License, RbacRole} from '~/config/constants.config'
import {config} from '~/config/main.config'
import {AppConfig} from '~/config/schemas/app.config.schema'
import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {ApiErrorException} from '~/helpers/errors.helper'
import {postCommitQueueStorage} from '~/helpers/post-commit-queue.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LicenseService} from '~/license/license.service'
import {LicenseMockRepository} from '~/repositories/license.mock.repository'
import {LicenseRepository} from '~/repositories/license.repository'

const admin: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: RbacRole.system,
    username: 'administrator',
}

const user = (role: RbacRole, data: Partial<AuthResponseDto> = {}): AuthResponseDto => ({
    ...admin,
    role,
    reseller_id_required: [RbacRole.reseller, RbacRole.ccare, RbacRole.subscriberadmin, RbacRole.subscriber].includes(role),
    ...data,
})

const customer = (id: number, productClass: ProductClass): SubscriberCustomer => ({
    id,
    productClass,
    externalId: null,
    maxSubscribers: null,
    resellerId: 1,
    resellerContractId: 1,
    resellerMaxSubscribers: null,
    extRangeMin: null,
    extRangeMax: null,
    soundSetId: null,
})

describe('SubscriberService', () => {
    let service: SubscriberService
    let repo: SubscriberMockRepository
    let redisRepo: SubscriberRedisMockRepository
    let licenseRepo: LicenseMockRepository
    let appConfig: AppConfig

    const makeSr = (u: AuthResponseDto): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params: undefined,
        query: {},
        user: u,
        req: undefined,
    })

    const seed = (id: number, resellerId: number, customerId: number): void => {
        repo.subscriberDB[id] = Object.assign(new internal.Subscriber(), {
            id,
            resellerId,
            customerId,
            customerProductClass: ProductClass.SipAccount,
            username: `user${id}`,
            domain: 'example.org',
            domainId: 1,
            provisioningId: id,
            provisioningDomainId: 1,
            status: VoipSubscriberStatus.Active,
            primaryNumber: null,
            aliasNumbers: [],
            pbxGroupIds: [],
            pbxGroupmemberIds: [],
        })
    }

    const ids = (subscribers: internal.Subscriber[]): number[] => subscribers.map(s => s.id).sort((a, b) => a - b)

    beforeEach(async () => {
        repo = new SubscriberMockRepository()
        redisRepo = new SubscriberRedisMockRepository()
        // reseller 1: customers 10 (subscribers 1, 2) and 11 (3); reseller 2: customer 20 (4)
        seed(1, 1, 10)
        seed(2, 1, 10)
        seed(3, 1, 11)
        seed(4, 2, 20)
        repo.customerDB[10] = customer(10, ProductClass.SipAccount)
        repo.customerDB[30] = customer(30, ProductClass.PbxAccount)
        repo.domainDB[1] = {id: 1, domain: 'example.org', resellerId: 1, provisioningId: 1}
        appConfig = structuredClone(config)
        licenseRepo = new LicenseMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriberService,
                {provide: SubscriberMariadbRepository, useValue: repo},
                {provide: SubscriberRedisRepository, useValue: redisRepo},
                {provide: I18nService, useValue: {t: (key: string): object => ({message: key, errorCode: key.replace('errors.', '')})}},
                {provide: AppService, useValue: {config: appConfig}},
                {provide: LicenseService, useValue: new LicenseService(undefined, licenseRepo as unknown as LicenseRepository)},
            ],
        }).compile()
        service = module.get<SubscriberService>(SubscriberService)
    })

    describe('readAll', () => {
        it.each([RbacRole.system, RbacRole.admin, RbacRole.ccareadmin])('%s reads all subscribers', async role => {
            const [subscribers, total] = await service.readAll(makeSr(user(role)))
            expect(ids(subscribers)).toEqual([1, 2, 3, 4])
            expect(total).toBe(4)
        })

        it.each([RbacRole.reseller, RbacRole.ccare])('%s reads the subscribers of its reseller', async role => {
            const [subscribers] = await service.readAll(makeSr(user(role, {reseller_id: 2})))
            expect(ids(subscribers)).toEqual([4])
        })

        it('subscriberadmin reads the subscribers of its customer', async () => {
            const [subscribers] = await service.readAll(makeSr(user(RbacRole.subscriberadmin, {id: 1, customer_id: 10})))
            expect(ids(subscribers)).toEqual([1, 2])
        })

        it('subscriber reads only itself', async () => {
            const [subscribers] = await service.readAll(makeSr(user(RbacRole.subscriber, {id: 2, customer_id: 10})))
            expect(ids(subscribers)).toEqual([2])
        })

        it('rejects other roles with 403', async () => {
            await expect(service.readAll(makeSr(user(RbacRole.lintercept)))).rejects.toThrow(ForbiddenException)
        })
    })

    describe('read', () => {
        it('reads a subscriber within the scope', async () => {
            const subscriber = await service.read(3, makeSr(user(RbacRole.reseller, {reseller_id: 1})))
            expect(subscriber.id).toBe(3)
        })

        it.each([
            ['reseller', user(RbacRole.reseller, {reseller_id: 1}), 4],
            ['subscriberadmin', user(RbacRole.subscriberadmin, {id: 1, customer_id: 10}), 3],
            ['subscriber', user(RbacRole.subscriber, {id: 2, customer_id: 10}), 1],
            ['admin', user(RbacRole.admin), 99],
        ])('%s gets 404 SUBSCRIBER_NOT_FOUND outside its scope', async (_name, u, id) => {
            const err = await service.read(id, makeSr(u)).catch((e: unknown) => e)
            expect(err).toBeInstanceOf(NotFoundException)
            expect((err as NotFoundException).message).toBe('errors.SUBSCRIBER_NOT_FOUND')
        })
    })

    describe('create', () => {
        const sipSubscriber = (values: Partial<internal.Subscriber> = {}): internal.Subscriber => Object.assign(new internal.Subscriber(), {
            customerId: 10,
            username: 'new',
            domain: 'example.org',
            password: 'secret',
            primaryNumber: {cc: 43, ac: '1', sn: '100'},
            ...values,
        })

        const failure = async (promise: Promise<unknown>): Promise<ApiErrorException> => {
            const err = await promise.catch((e: unknown) => e)
            expect(err).toBeInstanceOf(ApiErrorException)
            return err as ApiErrorException
        }

        it('rejects subscriber with 403', async () => {
            await expect(service.create([sipSubscriber()], makeSr(user(RbacRole.subscriber, {id: 2, customer_id: 10}))))
                .rejects.toThrow(ForbiddenException)
        })

        it('creates a subscriber with the customer preferences and allowed CLIs', async () => {
            const [created] = await service.create([sipSubscriber()], makeSr(user(RbacRole.admin)))
            expect(created).toMatchObject({customerId: 10, username: 'new', status: VoipSubscriberStatus.Active, lock: null})
            const plan = repo.plans[0]
            expect(plan.allowCli).toBe(true)
            expect(plan.preferences).toMatchObject({account_id: '10', reseller_id: '1', cc: '43', ac: '1', cli: '431100'})
            expect(plan.numbers.primary).toMatchObject({number: {cc: 43, ac: '1', sn: '100'}, isPrimary: true})
        })

        it('skips allowed CLIs with create_primary_acli=false', async () => {
            const sr = makeSr(user(RbacRole.admin))
            sr.query = {create_primary_acli: 'false'}
            await service.create([sipSubscriber()], sr)
            expect(repo.plans[0].allowCli).toBe(false)
        })

        it('rejects a subscriberadmin of a SIP customer without the write privilege with 403', async () => {
            const err = await failure(service.create([sipSubscriber({customerId: undefined})], makeSr(user(RbacRole.subscriberadmin, {id: 1, customer_id: 10}))))
            expect(err.getStatus()).toBe(403)
            expect(err.errorList[0].code).toBe('SUBSCRIBER_READ_ONLY')
        })

        it('lets a subscriberadmin with the write privilege take numbers from its own pool', async () => {
            appConfig.privileges.subscriberadmin.subscribers = ['write']
            repo.subscriberDB[1].aliasNumbers = [{numberId: 501, cc: 43, ac: '1', sn: '501', isDevId: false}]
            const sr = makeSr(user(RbacRole.subscriberadmin, {id: 1, customer_id: 10}))
            const [created] = await service.create([sipSubscriber({customerId: undefined, domain: undefined, primaryNumber: {cc: 43, ac: '1', sn: '501'}})], sr)
            expect(created.customerId).toBe(10)
            expect(repo.plans[0].numbers.primary).toMatchObject({numberId: 501, fromProvisioningId: 1})
            const err = await failure(service.create([sipSubscriber({customerId: undefined, username: 'other', primaryNumber: {cc: 43, ac: '1', sn: '999'}})], sr))
            expect(err.errorList[0]).toMatchObject({pointer: '/primary_number', code: 'SUBSCRIBER_NUMBER_NOT_IN_POOL'})
        })

        it.each([
            ['the pbx license is inactive', (): void => licenseRepo.setLicense(License.pbx, 0)],
            ['cloud PBX is disabled', (): void => {
                appConfig.features.cloudpbx = false
            }],
        ])('rejects PBX customers with 403 when %s', async (_case, disable) => {
            disable()
            const err = await failure(service.create([sipSubscriber({customerId: 30, isPbxPilot: true})], makeSr(user(RbacRole.admin))))
            expect(err.getStatus()).toBe(403)
            expect(err.errorList[0].code).toBe('LICENSE_PBX_INACTIVE')
        })

        it('rejects subscribers over the platform limit, counting the request', async () => {
            licenseRepo.setCount('max', 'subscribers', 6)
            licenseRepo.setCount('current', 'subscribers', 5)
            const err = await failure(service.create([
                sipSubscriber(),
                sipSubscriber({username: 'second', primaryNumber: {cc: 43, ac: '1', sn: '101'}}),
            ], makeSr(user(RbacRole.admin))))
            expect(err.errorList).toHaveLength(1)
            expect(err.errorList[0]).toMatchObject({code: 'SUBSCRIBER_LIMIT_REACHED', message: 'errors.SUBSCRIBER_LIMIT_REACHED'})
        })

        it.each([
            ['customer', (): void => {
                repo.customerDB[10].maxSubscribers = 2
            }],
            ['reseller', (): void => {
                repo.customerDB[10].resellerMaxSubscribers = 3
            }],
        ])('rejects subscribers over the %s limit', async (_case, limit) => {
            limit()
            const err = await failure(service.create([sipSubscriber()], makeSr(user(RbacRole.admin))))
            expect(err.errorList[0].code).toBe('SUBSCRIBER_LIMIT_REACHED')
        })
    })

    describe('terminate', () => {
        const sr = (u: AuthResponseDto): ServiceRequest => ({...makeSr(u), req: {method: 'DELETE', body: undefined, params: {}} as ServiceRequest['req']})

        /**
         * Runs the termination like a transactional request and then its post-commit callbacks
         */
        const terminate = async (ids: number[], u: AuthResponseDto): Promise<number[]> => {
            const store = {callbacks: [] as (() => void | Promise<void>)[]}
            const result = await postCommitQueueStorage.run(store, () => service.terminate(ids, sr(u)))
            for (const callback of store.callbacks)
                await callback()
            return result
        }

        const failure = async (ids: number[], u: AuthResponseDto): Promise<ApiErrorException> => {
            const err = await terminate(ids, u).catch((e: unknown) => e)
            expect(err).toBeInstanceOf(ApiErrorException)
            return err as ApiErrorException
        }

        const seedPbx = (): void => {
            // customer 30: pilot 31 with a pool number, seat 32 with an alias and a devid alias
            for (const id of [31, 32]) {
                seed(id, 1, 30)
                repo.subscriberDB[id].customerProductClass = ProductClass.PbxAccount
            }
            Object.assign(repo.subscriberDB[31], {isPbxPilot: true, primaryNumber: {numberId: 310, cc: 43, ac: '1', sn: '300'}})
            Object.assign(repo.subscriberDB[32], {
                primaryNumber: {numberId: 320, cc: 43, ac: '1', sn: '300101'},
                aliasNumbers: [
                    {numberId: 321, cc: 43, ac: '1', sn: '321', isDevId: false},
                    {numberId: 322, cc: 43, ac: '1', sn: '322', isDevId: true},
                ],
            })
        }

        it('rejects subscriber with 403', async () => {
            await expect(terminate([2], user(RbacRole.subscriber, {id: 2, customer_id: 10}))).rejects.toThrow(ForbiddenException)
        })

        it('rejects ids outside the scope with 422 per id', async () => {
            const err = await failure([1, 4], user(RbacRole.reseller, {reseller_id: 1}))
            expect(err.errorList).toEqual([expect.objectContaining({code: 'SUBSCRIBER_NOT_FOUND'})])
            expect(repo.terminatePlans).toHaveLength(0)
        })

        it('releases the numbers of a SIP subscriber and removes its registration after the commit', async () => {
            repo.subscriberDB[2].primaryNumber = {numberId: 200, cc: 43, ac: '1', sn: '200'}
            expect(await terminate([2], user(RbacRole.admin))).toEqual([2])
            expect(repo.terminatePlans[0].released).toEqual([expect.objectContaining({numberId: 200, toOwner: undefined})])
            expect(redisRepo.removedLocations).toEqual([['user2@example.org']])
            expect(redisRepo.trustedHostsReloads).toBe(1)
        })

        it('gives the aliases of a seat back to the pilot', async () => {
            seedPbx()
            await terminate([32], user(RbacRole.admin))
            const released = repo.terminatePlans[0].released
            expect(released.map(r => [r.numberId, r.toOwner?.id])).toEqual([[320, undefined], [321, 31], [322, 31]])
            expect(redisRepo.removedLocations).toEqual([['user32@example.org', '431322@example.org']])
        })

        it('rejects the pilot with other subscribers with 422', async () => {
            seedPbx()
            const err = await failure([31], user(RbacRole.admin))
            expect(err.getStatus()).toBe(422)
            expect(err.errorList[0].code).toBe('SUBSCRIBER_PBX_PILOT_HAS_SUBSCRIBERS')
        })

        it('terminates the pilot after its seats in one request, the trusted hosts reloaded once', async () => {
            seedPbx()
            expect(await terminate([32, 31], user(RbacRole.admin))).toEqual([32, 31])
            expect(repo.terminatePlans.map(plan => plan.subscriber.id)).toEqual([32, 31])
            expect(repo.terminatePlans[1].released.every(r => r.toOwner == undefined)).toBe(true)
            expect(redisRepo.removedLocations).toHaveLength(1)
            expect(redisRepo.trustedHostsReloads).toBe(1)
        })

        it.each([
            ['itself', 32, 'SUBSCRIBER_TERMINATE_SELF'],
            ['the pilot', 31, 'SUBSCRIBER_TERMINATE_PILOT'],
        ])('rejects a subscriberadmin terminating %s with 403', async (_case, id, code) => {
            seedPbx()
            const err = await failure([id], user(RbacRole.subscriberadmin, {id: 32, customer_id: 30}))
            expect(err.getStatus()).toBe(403)
            expect(err.errorList[0].code).toBe(code)
        })

        it('rejects a subscriberadmin of a SIP customer without the write privilege with 403', async () => {
            const err = await failure([2], user(RbacRole.subscriberadmin, {id: 1, customer_id: 10}))
            expect(err.getStatus()).toBe(403)
            expect(err.errorList[0].code).toBe('SUBSCRIBER_READ_ONLY')
        })

        it('lets a subscriberadmin with the write privilege terminate another subscriber', async () => {
            appConfig.privileges.subscriberadmin.subscribers = ['write']
            expect(await terminate([2], user(RbacRole.subscriberadmin, {id: 1, customer_id: 10}))).toEqual([2])
        })
    })
})
