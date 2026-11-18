import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {PeeringInboundRuleModule} from './inbound-rule.module'
import {PeeringInboundRuleService} from './inbound-rule.service'
import {PeeringInboundRuleMariadbRepository} from './repositories/inbound-rule.mariadb.repository'
import {PeeringInboundRuleMockRepository} from './repositories/inbound-rule.mock.repository'
import {PeeringInboundRuleRedisRepository} from './repositories/inbound-rule.redis.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {VoipPeeringInboundRuleField, VoipPeeringInboundRuleMoveDirection} from '~/entities/internal/voip-peering-inbound-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
import {postCommitQueueStorage} from '~/helpers/post-commit-queue.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: RbacRole.admin,
    role_data: internal.AclRole.create({id: 2, has_access_to: [internal.AclRole.create({id: 2})]}),
    username: 'administrator',
}

const {Up, Down} = VoipPeeringInboundRuleMoveDirection

describe('PeeringInboundRuleService', () => {
    let service: PeeringInboundRuleService
    let ruleRepo: PeeringInboundRuleMockRepository
    const ruleRedisRepo = {
        reloadKamProxLcr: jest.fn(() => Promise.resolve()),
        reloadKamProxDispatcher: jest.fn(() => Promise.resolve()),
    }

    const rule = (groupId: number, priority: number, id?: number): internal.VoipPeeringInboundRule => Object.assign(new internal.VoipPeeringInboundRule(), {
        id,
        groupId,
        field: VoipPeeringInboundRuleField.FromUser,
        pattern: `^rule${id}`,
        priority,
        enabled: false,
    })

    const seed = (id: number, groupId: number, priority: number): void => {
        ruleRepo.db[id] = rule(groupId, priority, id)
    }

    const priorities = (): Record<number, number> =>
        Object.fromEntries(Object.values(ruleRepo.db).map(entry => [entry.id, entry.priority]))

    const makeSr = (body: unknown, params: Record<string, string> = {}): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params,
        query: {},
        user,
        req: {method: 'POST', body, params} as never,
    })

    /**
     * Runs the call like a transactional request and then its post-commit callbacks
     */
    const run = async <T>(fn: () => Promise<T>): Promise<T> => {
        const store = {callbacks: [] as (() => void | Promise<void>)[]}
        const result = await postCommitQueueStorage.run(store, fn)
        for (const callback of store.callbacks)
            await callback()
        return result
    }

    const failure = async (fn: () => Promise<unknown>): Promise<ApiErrorException> => {
        const err = await run(fn).catch((e: unknown) => e)
        expect(err).toBeInstanceOf(ApiErrorException)
        return err as ApiErrorException
    }

    const errorEntries = (err: ApiErrorException): [string, string][] =>
        err.errorList.map(entry => [entry.pointer, entry.code])

    beforeEach(async () => {
        jest.clearAllMocks()
        ruleRepo = new PeeringInboundRuleMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, PeeringInboundRuleModule],
        })
            .overrideProvider(PeeringInboundRuleMariadbRepository).useValue(ruleRepo)
            .overrideProvider(PeeringInboundRuleRedisRepository).useValue(ruleRedisRepo)
            .compile()
        service = module.get<PeeringInboundRuleService>(PeeringInboundRuleService)
        seed(1, 1, 10)
        seed(2, 1, 20)
        seed(3, 1, 30)
        seed(4, 2, 10)
    })

    describe('create', () => {
        it('creates rules with unused priorities, also one used in another group', async () => {
            const rules = [rule(1, 40), rule(2, 20)]
            const created = await run(() => service.create(rules, makeSr(rules)))
            expect(created.map(entry => [entry.groupId, entry.priority])).toEqual([[1, 40], [2, 20]])
        })

        it('rejects rules with the same group and priority in the request', async () => {
            const rules = [rule(1, 40), rule(2, 40), rule(1, 40)]
            const err = await failure(() => service.create(rules, makeSr(rules)))
            expect(errorEntries(err)).toEqual([
                ['/0/priority', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS'],
                ['/2/priority', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS'],
            ])
        })

        it('rejects a rule with the priority of an existing rule of the group', async () => {
            const rules = [rule(1, 20)]
            const err = await failure(() => service.create(rules, makeSr({})))
            expect(errorEntries(err)).toEqual([['/priority', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS']])
            expect(err.errorList[0].message).toContain('20')
            expect(Object.keys(ruleRepo.db)).toHaveLength(4)
        })
    })

    describe('update', () => {
        it('swaps the priorities of two rules in one request', async () => {
            const updates: Dictionary<internal.VoipPeeringInboundRule> = {1: rule(1, 20, 1), 2: rule(1, 10, 2)}
            await run(() => service.update(updates, makeSr(updates)))
            expect(priorities()).toMatchObject({1: 20, 2: 10})
        })

        it('keeps a rule with an unchanged legacy duplicate priority editable', async () => {
            seed(5, 1, 30)
            const updates: Dictionary<internal.VoipPeeringInboundRule> = {5: {...rule(1, 30, 5), pattern: '^changed'}}
            await run(() => service.update(updates, makeSr(updates, {id: '5'})))
            expect(ruleRepo.db[5].pattern).toEqual('^changed')
        })

        it('rejects a group change into a used priority', async () => {
            const updates: Dictionary<internal.VoipPeeringInboundRule> = {3: rule(1, 30, 3), 4: rule(1, 10, 4)}
            const err = await failure(() => service.update(updates, makeSr(updates)))
            expect(errorEntries(err)).toEqual([['/4/priority', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS']])
        })

        it('rejects a priority change into the priority of an unchanged rule of the request', async () => {
            const updates: Dictionary<internal.VoipPeeringInboundRule> = {1: rule(1, 10, 1), 2: rule(1, 10, 2)}
            const err = await failure(() => service.update(updates, makeSr(updates)))
            expect(errorEntries(err)).toEqual([['/2/priority', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS']])
        })

        it('reports a single route without an item pointer', async () => {
            const updates: Dictionary<internal.VoipPeeringInboundRule> = {2: rule(1, 30, 2)}
            const err = await failure(() => service.update(updates, makeSr({}, {id: '2'})))
            expect(errorEntries(err)).toEqual([['/priority', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS']])
        })
    })

    describe('move', () => {
        const move = (id: number, direction: VoipPeeringInboundRuleMoveDirection, params: Record<string, string> = {}): Promise<internal.VoipPeeringInboundRule[]> =>
            run(() => service.move(id, direction, makeSr({direction}, {id: `${id}`, ...params})))

        it('swaps the priority with the previous rule on up', async () => {
            const changed = await move(2, Up)
            expect(changed.map(entry => [entry.id, entry.priority])).toEqual([[2, 10], [1, 20]])
            expect(priorities()).toEqual({1: 20, 2: 10, 3: 30, 4: 10})
            expect(ruleRedisRepo.reloadKamProxLcr).toHaveBeenCalledTimes(1)
            expect(ruleRedisRepo.reloadKamProxDispatcher).not.toHaveBeenCalled()
        })

        it('swaps the priority with the next rule on down', async () => {
            await move(2, Down)
            expect(priorities()).toEqual({1: 10, 2: 30, 3: 20, 4: 10})
        })

        it.each([[1, Up], [3, Down]])('rejects moving rule %s %s at the edge of the group', async (id, direction) => {
            const err = await failure(() => move(id, direction))
            expect(errorEntries(err)).toEqual([['/direction', 'PEERING_INBOUND_RULE_CANNOT_MOVE']])
            expect(priorities()).toEqual({1: 10, 2: 20, 3: 30, 4: 10})
        })

        it('moves a rule up past a tied rule', async () => {
            seed(5, 3, 40)
            seed(6, 3, 50)
            seed(7, 3, 50)
            const changed = await move(7, Up)
            expect(changed.map(entry => [entry.id, entry.priority])).toEqual([[7, 49]])
            expect(priorities()).toMatchObject({5: 40, 6: 50, 7: 49})
        })

        it('moves a rule down past a tied rule', async () => {
            seed(5, 3, 50)
            seed(6, 3, 50)
            await move(5, Down)
            expect(priorities()).toMatchObject({5: 51, 6: 50})
        })

        it('rejects a tie shift into a used priority', async () => {
            seed(5, 3, 49)
            seed(6, 3, 50)
            seed(7, 3, 50)
            const err = await failure(() => move(7, Up))
            expect(errorEntries(err)).toEqual([['/direction', 'PEERING_INBOUND_RULE_PRIORITY_EXISTS']])
            expect(priorities()).toMatchObject({5: 49, 6: 50, 7: 50})
        })

        it('rejects a tie shift below priority 1', async () => {
            seed(5, 3, 1)
            seed(6, 3, 1)
            const err = await failure(() => move(6, Up))
            expect(errorEntries(err)).toEqual([['/direction', 'PEERING_INBOUND_RULE_CANNOT_MOVE']])
            expect(priorities()).toMatchObject({5: 1, 6: 1})
        })

        it('does not find a rule of another group than the path group', async () => {
            await expect(run(() => move(4, Up, {groupId: '1'}))).rejects.toThrow(NotFoundException)
        })
    })
})
