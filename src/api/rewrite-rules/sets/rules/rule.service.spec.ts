import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {RewriteRuleMariadbRepository} from './repositories/rule.mariadb.repository'
import {RewriteRuleMockRepository} from './repositories/rule.mock.repository'
import {RewriteRuleRedisRepository} from './repositories/rule.redis.repository'
import {RewriteRuleModule} from './rule.module'
import {RewriteRuleService} from './rule.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField, RewriteRuleMoveDirection} from '~/entities/internal/rewrite-rule.internal.entity'
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

const {Up, Down} = RewriteRuleMoveDirection
const {In, Out} = RewriteRuleDirection
const {Caller, Callee} = RewriteRuleField

describe('RewriteRuleService', () => {
    let service: RewriteRuleService
    let ruleRepo: RewriteRuleMockRepository
    const ruleRedisRepo = {
        reloadDialPlan: jest.fn(() => Promise.resolve()),
    }

    // mock fixtures: set 1 holds rules 1-4 (in/callee, priorities 1-4), 5 (out/callee, 2) and 6 (in/caller, 2);
    // set 2: tie 7/8 at 5; set 3: tie 9/10 at 0; set 4: 11 at 4, tie 12/13 at 5
    const priorities = async (sr: ServiceRequest): Promise<Record<number, number>> => {
        const [rules] = await ruleRepo.readAll(sr)
        return Object.fromEntries(rules.map(entry => [entry.id, entry.priority]))
    }

    const makeSr = (body: unknown, params: Record<string, string> = {}, srUser: AuthResponseDto = user): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params,
        query: {},
        user: srUser,
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

    const move = (id: number, direction: RewriteRuleMoveDirection, params: Record<string, string> = {}, srUser: AuthResponseDto = user): Promise<internal.RewriteRule[]> =>
        run(() => service.move(id, direction, makeSr({direction}, {id: `${id}`, ...params}, srUser)))

    beforeEach(async () => {
        jest.clearAllMocks()
        ruleRepo = new RewriteRuleMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, RewriteRuleModule],
        })
            .overrideProvider(RewriteRuleMariadbRepository).useValue(ruleRepo)
            .overrideProvider(RewriteRuleRedisRepository).useValue(ruleRedisRepo)
            .compile()
        service = module.get<RewriteRuleService>(RewriteRuleService)
    })

    const rule = (props: Partial<internal.RewriteRule>): internal.RewriteRule => Object.assign(new internal.RewriteRule(), {
        setId: 1,
        direction: In,
        field: Callee,
        matchPattern: '^1',
        replacePattern: '2',
        description: 'new',
        enabled: true,
    }, props)

    const create = (rules: internal.RewriteRule[], body: unknown = rules): Promise<internal.RewriteRule[]> =>
        run(() => service.create(rules, makeSr(body)))

    const update = (updates: Dictionary<internal.RewriteRule>, params: Record<string, string> = {}): Promise<number[]> =>
        run(() => service.update(updates, makeSr(updates, params)))

    describe('create', () => {
        it('counts up the priorities of rules without one after the highest of each set', async () => {
            const created = await create([rule({setId: 1}), rule({setId: 2}), rule({setId: 1}), rule({setId: 5})])
            expect(created.map(entry => [entry.setId, entry.priority])).toEqual([[1, 5], [2, 6], [1, 6], [5, 1]])
        })

        it('counts up after the explicit priorities of the request too', async () => {
            const created = await create([rule({priority: 20}), rule({}), rule({}), rule({priority: 7})])
            expect(created.map(entry => entry.priority)).toEqual([20, 21, 22, 7])
        })

        it('keeps an explicit priority 0', async () => {
            const created = await create([rule({setId: 5, priority: 0}), rule({setId: 5})])
            expect(created.map(entry => entry.priority)).toEqual([0, 1])
        })

        it('locks the sets before the highest priority is read', async () => {
            const lock = jest.spyOn(ruleRepo, 'lockSets')
            const read = jest.spyOn(ruleRepo, 'readMaxPriorities')
            await create([rule({setId: 2}), rule({setId: 1})])
            expect(lock).toHaveBeenCalledWith([2, 1])
            expect(lock.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0])
        })

        it('deflates the patterns', async () => {
            const [created] = await create([rule({matchPattern: '^${x}', replacePattern: '${y}'})])
            expect(created.matchPattern).toEqual('^$avp(s:x)')
            expect(created.replacePattern).toEqual('$avp(s:y)')
        })

        it('allows the priority of another direction, field or set', async () => {
            const created = await create([
                rule({priority: 3, direction: Out}),
                rule({priority: 3, field: Caller}),
                rule({priority: 3, setId: 2}),
            ])
            expect(created).toHaveLength(3)
        })

        it('rejects the priority of an existing rule of the set, direction and field', async () => {
            const rules = [rule({priority: 4})]
            const err = await failure(() => create(rules, {}))
            expect(errorEntries(err)).toEqual([['/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
            expect(err.errorList[0].message).toContain('4')
            expect((await ruleRepo.readAll(makeSr({})))[1]).toEqual(13)
        })

        it('rejects rules with the same key in the request', async () => {
            const rules = [rule({priority: 40}), rule({priority: 40, setId: 2}), rule({priority: 40})]
            const err = await failure(() => create(rules))
            expect(errorEntries(err)).toEqual([
                ['/0/priority', 'REWRITE_RULE_PRIORITY_EXISTS'],
                ['/2/priority', 'REWRITE_RULE_PRIORITY_EXISTS'],
            ])
        })
    })

    describe('update', () => {
        it('swaps the priorities of two rules in one request', async () => {
            await update({1: rule({id: 1, priority: 2}), 2: rule({id: 2, priority: 1})})
            expect(await priorities(makeSr({}))).toMatchObject({1: 2, 2: 1})
        })

        it('allows a free priority', async () => {
            await update({1: rule({id: 1, priority: 10})}, {id: '1'})
            expect(await priorities(makeSr({}))).toMatchObject({1: 10})
        })

        it('does not check rules keeping set, direction, field and priority, so legacy duplicates stay editable', async () => {
            await update({7: rule({id: 7, setId: 2, priority: 5, description: 'changed'})}, {id: '7'})
            expect((await ruleRepo.readById(7, makeSr({}))).description).toEqual('changed')
        })

        it('counts a missing priority as the stored one and still writes it as given', async () => {
            const withoutPriority = rule({id: 7, setId: 2, priority: null, description: 'changed'})
            await update({7: withoutPriority}, {id: '7'})
            expect((await ruleRepo.readById(7, makeSr({}))).description).toEqual('changed')
            expect(withoutPriority.priority).toBeNull()
        })

        it('checks a partial update (PATCH) against the stored set, direction and field', async () => {
            const partial = (props: Partial<internal.RewriteRule>): internal.RewriteRule => Object.assign(new internal.RewriteRule(), props)
            const err = await failure(() => update({1: partial({id: 1, priority: 2})}, {id: '1'}))
            expect(errorEntries(err)).toEqual([['/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
            await update({1: partial({id: 1, priority: 10})}, {id: '1'})
            await update({7: partial({id: 7, description: 'changed'})}, {id: '7'})
            expect(await priorities(makeSr({}))).toMatchObject({1: 10})
        })

        it('rejects a priority change into a used priority', async () => {
            const err = await failure(() => update({1: rule({id: 1, priority: 2})}, {id: '1'}))
            expect(errorEntries(err)).toEqual([['/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
            expect(await priorities(makeSr({}))).toMatchObject({1: 1, 2: 2})
        })

        it('rejects a direction change into a used priority', async () => {
            const err = await failure(() => update({5: rule({id: 5, direction: In, priority: 2})}))
            expect(errorEntries(err)).toEqual([['/5/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
        })

        it('rejects a field change into a used priority', async () => {
            const err = await failure(() => update({6: rule({id: 6, field: Callee, priority: 2})}))
            expect(errorEntries(err)).toEqual([['/6/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
        })

        it('rejects a set change into a used priority', async () => {
            const err = await failure(() => update({7: rule({id: 7, setId: 1, priority: 4})}))
            expect(errorEntries(err)).toEqual([['/7/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
        })

        it('rejects a priority change into the priority of an unchanged rule of the request', async () => {
            const err = await failure(() => update({1: rule({id: 1, priority: 2}), 2: rule({id: 2, priority: 2})}))
            expect(errorEntries(err)).toEqual([['/1/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
        })

        it('locks the old and the new sets of the changed rules', async () => {
            const lock = jest.spyOn(ruleRepo, 'lockSets')
            await update({9: rule({id: 9, setId: 1, priority: 20}), 1: rule({id: 1, priority: 1})})
            expect(lock).toHaveBeenCalledWith([3, 1])
        })
    })

    describe('clone', () => {
        const clone = (id: number, overrides: Partial<internal.RewriteRule> = {}, params: Record<string, string> = {}): Promise<internal.RewriteRule> =>
            run(() => service.clone(id, Object.assign(new internal.RewriteRule(), overrides), makeSr({}, {id: `${id}`, ...params})))

        it('copies the rule to the end of its set without a priority', async () => {
            const cloned = await clone(2)
            expect(cloned).toMatchObject({
                setId: 1,
                matchPattern: 'match2',
                replacePattern: 'replace2',
                description: 'desc2',
                direction: In,
                field: Callee,
                enabled: true,
                priority: 5,
            })
            expect(cloned.id).not.toEqual(2)
        })

        it('uses the priority of the overrides', async () => {
            const cloned = await clone(2, {priority: 30})
            expect(cloned.priority).toEqual(30)
        })

        it('rejects a priority another rule of the set, direction and field uses', async () => {
            const err = await failure(() => clone(2, {priority: 3}))
            expect(errorEntries(err)).toEqual([['/priority', 'REWRITE_RULE_PRIORITY_EXISTS']])
        })

        it('copies into the set of the overrides, after its highest priority', async () => {
            const cloned = await clone(2, {setId: 2})
            expect(cloned.setId).toEqual(2)
            expect(cloned.priority).toEqual(6)
        })

        it('keeps the patterns deflated like a created rule', async () => {
            const cloned = await clone(2, {matchPattern: '^${x}'})
            expect(cloned.matchPattern).toEqual('^$avp(s:x)')
        })

        it('reloads the dial plan', async () => {
            await clone(2)
            expect(ruleRedisRepo.reloadDialPlan).toHaveBeenCalledTimes(1)
        })

        it('throws 404 for a rule of another set than the one in the path', async () => {
            await expect(clone(2, {}, {setId: '2'})).rejects.toThrow(NotFoundException)
        })

        it('throws 404 for an unknown rule', async () => {
            await expect(clone(100)).rejects.toThrow(NotFoundException)
        })
    })

    describe('move', () => {
        it('swaps the priority with the previous rule on up', async () => {
            const changed = await move(2, Up)
            expect(changed.map(entry => [entry.id, entry.priority])).toEqual([[2, 1], [1, 2]])
            expect(await priorities(makeSr({}))).toMatchObject({1: 2, 2: 1, 3: 3, 4: 4})
            expect(ruleRedisRepo.reloadDialPlan).toHaveBeenCalledTimes(1)
        })

        it('swaps the priority with the next rule on down', async () => {
            await move(2, Down)
            expect(await priorities(makeSr({}))).toMatchObject({1: 1, 2: 3, 3: 2, 4: 4})
        })

        it('swaps through an unused priority of the set in three steps', async () => {
            const spy = jest.spyOn(ruleRepo, 'updatePriority')
            await move(2, Up)
            expect(spy.mock.calls).toEqual([[1, 5], [2, 1], [1, 2]])
        })

        it.each([[1, Up], [4, Down]])('rejects moving rule %s %s at the edge of its order', async (id, direction) => {
            const err = await failure(() => move(id, direction))
            expect(errorEntries(err)).toEqual([['/direction', 'REWRITE_RULE_CANNOT_MOVE']])
            expect(await priorities(makeSr({}))).toMatchObject({1: 1, 2: 2, 3: 3, 4: 4})
        })

        it('ignores rules of another direction or field', async () => {
            const changed = await move(2, Down)
            expect(changed.map(entry => entry.id)).toEqual([2, 3])
            const err = await failure(() => move(5, Up))
            expect(errorEntries(err)).toEqual([['/direction', 'REWRITE_RULE_CANNOT_MOVE']])
            expect(await priorities(makeSr({}))).toMatchObject({5: 2, 6: 2})
        })

        it('moves a rule up past a tied rule', async () => {
            const changed = await move(8, Up)
            expect(changed.map(entry => [entry.id, entry.priority])).toEqual([[8, 4]])
            expect(await priorities(makeSr({}))).toMatchObject({7: 5, 8: 4})
        })

        it('moves a rule down past a tied rule', async () => {
            const spy = jest.spyOn(ruleRepo, 'updatePriority')
            await move(7, Down)
            expect(spy.mock.calls).toEqual([[7, 6]])
            expect(await priorities(makeSr({}))).toMatchObject({7: 6, 8: 5})
        })

        it('rejects a tie shift into a used priority', async () => {
            const err = await failure(() => move(13, Up))
            expect(errorEntries(err)).toEqual([['/direction', 'REWRITE_RULE_PRIORITY_EXISTS']])
            expect(err.errorList[0].message).toContain('4')
            expect(await priorities(makeSr({}))).toMatchObject({11: 4, 12: 5, 13: 5})
        })

        it('rejects a tie shift below priority 0', async () => {
            const err = await failure(() => move(10, Up))
            expect(errorEntries(err)).toEqual([['/direction', 'REWRITE_RULE_CANNOT_MOVE']])
            expect(await priorities(makeSr({}))).toMatchObject({9: 0, 10: 0})
        })

        it('returns the patterns of both rules inflated', async () => {
            const [rule3] = await ruleRepo.readAll(makeSr({})).then(([rules]) => rules.filter(entry => entry.id == 3))
            await ruleRepo.update({3: {...rule3, matchPattern: '$avp(s:x)', replacePattern: '$avp(s:y)'}}, makeSr({}))
            const changed = await move(2, Down)
            expect(changed.map(entry => [entry.id, entry.matchPattern, entry.replacePattern])).toEqual([
                [2, 'match2', 'replace2'],
                [3, '${x}', '${y}'],
            ])
            expect((await ruleRepo.readById(3, makeSr({}))).matchPattern).toEqual('$avp(s:x)')
        })

        it('does not find a rule of another set than the path set', async () => {
            await expect(move(7, Up, {setId: '1'})).rejects.toThrow(NotFoundException)
        })

        it('does not find a rule of a foreign reseller', async () => {
            const reseller: AuthResponseDto = {...user, role: RbacRole.reseller, reseller_id: 2, reseller_id_required: true}
            await expect(move(2, Up, {}, reseller)).rejects.toThrow(NotFoundException)
        })
    })
})
