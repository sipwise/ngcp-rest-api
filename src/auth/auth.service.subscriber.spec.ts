import {Request} from 'express'

import {AuthService} from './auth.service'
import {JwtStrategy} from './jwt.strategy'

import {AuthTokenRedisRepository} from '~/api/auth/tokens/repositories/token.redis.repository'
import {AppService} from '~/app.service'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

describe('subscriber authentication', () => {
    let subscriberRepo: {findOne: jest.Mock}
    let preferenceRepo: {findOne: jest.Mock}
    let service: AuthService
    let compare: jest.SpyInstance

    const subscriber = (status: string, contractStatus: string, admin = false): db.provisioning.VoipSubscriber =>
        Object.assign(new db.provisioning.VoipSubscriber(), {
            id: 5,
            uuid: 'a2b4c6d8-0000-4000-8000-000000000001',
            webusername: 'subuser',
            webpassword: 'salt$hash',
            account_id: 7,
            admin,
            billing_voip_subscriber: Object.assign(new db.billing.VoipSubscriber(), {id: 11, status}),
            contract: Object.assign(new db.billing.Contract(), {
                id: 7,
                status: contractStatus,
                contact: Object.assign(new db.billing.Contact(), {reseller_id: 1}),
            }),
        })

    // [subscriber status, lock level, customer status]
    const allowed: [string, string, string][] = [
        [VoipSubscriberStatus.Active, null, ContractStatus.Active],
        [VoipSubscriberStatus.Active, '1', ContractStatus.Active],
        [VoipSubscriberStatus.Active, '2', ContractStatus.Active],
        [VoipSubscriberStatus.Locked, '3', ContractStatus.Active],
        [VoipSubscriberStatus.Active, '5', ContractStatus.Active],
    ]
    const blocked: [string, string, string][] = [
        [VoipSubscriberStatus.Locked, '4', ContractStatus.Active],
        [VoipSubscriberStatus.Active, '4', ContractStatus.Active],
        [VoipSubscriberStatus.Active, null, ContractStatus.Locked],
        [VoipSubscriberStatus.Active, null, ContractStatus.Pending],
        [VoipSubscriberStatus.Active, null, ContractStatus.Terminated],
    ]

    const setLock = (lock: string | null): void => {
        preferenceRepo.findOne.mockResolvedValue(lock == null ? null : Object.assign(new db.provisioning.VoipUsrPreference(), {subscriber_id: 5, value: lock}))
    }

    beforeEach(() => {
        subscriberRepo = {findOne: jest.fn()}
        preferenceRepo = {findOne: jest.fn().mockResolvedValue(null)}
        const app = {dbRepo: jest.fn(entity => entity === db.provisioning.VoipUsrPreference ? preferenceRepo : subscriberRepo)}
        service = new AuthService(app as unknown as AppService, undefined, undefined)
        compare = jest.spyOn(service, 'compareBcryptPassword').mockImplementation(async (pass: string) => pass === 'good')
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('validateSubscriber', () => {
        it.each([false, true])('returns an active subscriber of an active customer (admin %s)', async admin => {
            jest.spyOn(db.provisioning.VoipSubscriber, 'findOne')
                .mockResolvedValue(subscriber(VoipSubscriberStatus.Active, ContractStatus.Active, admin))
            const user = await service.validateSubscriber(undefined, 'subuser', 'good', 'example.org', 'subscriber')
            expect(user).toEqual(expect.objectContaining({
                id: 11,
                uuid: 'a2b4c6d8-0000-4000-8000-000000000001',
                customer_id: 7,
                role: admin ? 'subscriberadmin' : 'subscriber',
                active: true,
            }))
        })

        it('returns null for a wrong password', async () => {
            jest.spyOn(db.provisioning.VoipSubscriber, 'findOne')
                .mockResolvedValue(subscriber(VoipSubscriberStatus.Active, ContractStatus.Active))
            await expect(service.validateSubscriber(undefined, 'subuser', 'bad', 'example.org', 'subscriber')).resolves.toBeNull()
        })

        it.each(allowed)('accepts subscriber status %s, lock %s, customer status %s', async (status, lock, contractStatus) => {
            jest.spyOn(db.provisioning.VoipSubscriber, 'findOne').mockResolvedValue(subscriber(status, contractStatus))
            setLock(lock)
            await expect(service.validateSubscriber(undefined, 'subuser', 'good', 'example.org', 'subscriber')).resolves.toEqual(expect.objectContaining({id: 11}))
        })

        it.each(blocked)('returns null for subscriber status %s, lock %s, customer status %s without a password check', async (status, lock, contractStatus) => {
            jest.spyOn(db.provisioning.VoipSubscriber, 'findOne').mockResolvedValue(subscriber(status, contractStatus))
            setLock(lock)
            await expect(service.validateSubscriber(undefined, 'subuser', 'good', 'example.org', 'subscriber')).resolves.toBeNull()
            expect(compare).not.toHaveBeenCalled()
        })
    })

    describe('jwt strategy', () => {
        const req = {
            path: '/api/auth/userinfo',
            params: {},
            query: {},
            headers: {'x-auth-realm': 'subscriber'},
            header: (name: string): string => name === 'x-auth-realm' ? 'subscriber' : undefined,
        } as unknown as Request
        const payload = {username: 'subuser', subscriber_uuid: 'a2b4c6d8-0000-4000-8000-000000000001'}
        let strategy: JwtStrategy

        beforeEach(() => {
            const app = {dbRepo: jest.fn(() => subscriberRepo)} as unknown as AppService
            strategy = new JwtStrategy(app, service, {} as AuthTokenRedisRepository)
        })

        it.each(allowed)('accepts the token for subscriber status %s, lock %s, customer status %s', async (status, lock, contractStatus) => {
            subscriberRepo.findOne.mockResolvedValue(subscriber(status, contractStatus))
            setLock(lock)
            await expect(strategy.validate(req, payload)).resolves.toEqual(expect.objectContaining({id: 11, role: 'subscriber'}))
        })

        it.each(blocked)('rejects the token for subscriber status %s, lock %s, customer status %s', async (status, lock, contractStatus) => {
            subscriberRepo.findOne.mockResolvedValue(subscriber(status, contractStatus))
            setLock(lock)
            await expect(strategy.validate(req, payload)).resolves.toBeNull()
        })
    })
})
