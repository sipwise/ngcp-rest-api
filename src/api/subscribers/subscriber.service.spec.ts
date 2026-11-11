import {ForbiddenException, NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'
import {I18nService} from 'nestjs-i18n'

import {SubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {SubscriberMockRepository} from './repositories/subscriber.mock.repository'
import {SubscriberService} from './subscriber.service'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {ServiceRequest} from '~/interfaces/service-request.interface'

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

describe('SubscriberService', () => {
    let service: SubscriberService
    let repo: SubscriberMockRepository

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
            status: VoipSubscriberStatus.Active,
            aliasNumbers: [],
        })
    }

    const ids = (subscribers: internal.Subscriber[]): number[] => subscribers.map(s => s.id).sort((a, b) => a - b)

    beforeEach(async () => {
        repo = new SubscriberMockRepository()
        // reseller 1: customers 10 (subscribers 1, 2) and 11 (3); reseller 2: customer 20 (4)
        seed(1, 1, 10)
        seed(2, 1, 10)
        seed(3, 1, 11)
        seed(4, 2, 20)
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriberService,
                {provide: SubscriberMariadbRepository, useValue: repo},
                {provide: I18nService, useValue: {t: (key: string): string => key}},
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
})
