import {HeaderManipulationRuleService} from './rule.service'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/set.redis.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/rule.mariadb.repository'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {postCommitQueueStorage} from '~/helpers/post-commit-queue.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const admin: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

const sr: ServiceRequest = {
    returnContent: true,
    headers: [undefined],
    params: undefined,
    query: {},
    user: admin,
    req: {method: 'PATCH'} as never,
}

function rule(id: number, setId: number): internal.HeaderRule {
    return Object.assign(new internal.HeaderRule(), {id, setId})
}

describe('HeaderManipulationRuleService', () => {
    let service: HeaderManipulationRuleService
    let rules: internal.HeaderRule[]
    let invalidated: number[]

    const i18n = {t: jest.fn((key: string) => ({message: key, code: 0}))}
    const ruleRepo = {
        readWhereInIds: jest.fn(() => Promise.resolve(rules)),
        update: jest.fn(() => Promise.resolve(rules.map(r => r.id))),
        delete: jest.fn((ids: number[]) => Promise.resolve(ids)),
        readSetIdsWithRules: jest.fn((setIds: number[]) => Promise.resolve(setIds)),
    }
    const ruleSetRepo = {
        readWhereInIds: jest.fn(() => Promise.resolve([])),
        delete: jest.fn((ids: number[]) => Promise.resolve(ids)),
    }
    const ruleSetRedisRepo = {
        invalidateRuleSet: jest.fn((setId: number) => {
            invalidated.push(setId)
            return Promise.resolve()
        }),
    }

    async function runTransactional<T>(fn: () => Promise<T>): Promise<T> {
        const store = {callbacks: [] as (() => void | Promise<void>)[]}
        const result = await postCommitQueueStorage.run(store, fn)
        for (const callback of store.callbacks)
            await callback()
        return result
    }

    beforeEach(() => {
        invalidated = []
        jest.clearAllMocks()
        service = new HeaderManipulationRuleService(
            i18n as never,
            ruleRepo as unknown as HeaderManipulationRuleMariadbRepository,
            ruleSetRepo as unknown as HeaderManipulationSetMariadbRepository,
            ruleSetRedisRepo as unknown as HeaderManipulationSetRedisRepository,
        )
    })

    it('invalidates each rule set once on update', async () => {
        rules = [rule(1, 10), rule(2, 10), rule(3, 20)]
        await runTransactional(() => service.update({1: rules[0], 2: rules[1], 3: rules[2]}, sr))
        expect(invalidated).toEqual([10, 20])
    })

    it('invalidates each rule set once on delete', async () => {
        rules = [rule(1, 10), rule(2, 10), rule(3, 20)]
        await runTransactional(() => service.delete([1, 2, 3], sr))
        expect(invalidated).toEqual([10, 20])
        expect(ruleSetRepo.delete).not.toHaveBeenCalled()
    })
})
