import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {RewriteRuleSetRequestDto} from './dto/set-request.dto'
import {RewriteRuleSetMariadbRepository} from './repositories/set.mariadb.repository'
import {RewriteRuleSetMockRepository} from './repositories/set.mock.repository'
import {RewriteRuleSetMockRedisRepository} from './repositories/set.redis.mock.repository'
import {RewriteRuleSetRedisRepository} from './repositories/set.redis.repository'
import {RewriteRuleSetModule} from './set.module'
import {RewriteRuleSetService} from './set.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {TaskAgentMockHelper} from '~/helpers/task-agent-mock.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 2,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

describe('RewriteRuleSet Service', () => {
    let service: RewriteRuleSetService
    let rwrMockRepo: RewriteRuleSetMockRepository
    let redisMockRepo: RewriteRuleSetMockRedisRepository

    let sr: ServiceRequest
    let reloadSpy: jest.SpyInstance
    const resellerUser: AuthResponseDto = {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}

    const makeUpdates = (...ids: number[]): Dictionary<internal.RewriteRuleSet> => {
        const updates = new Dictionary<internal.RewriteRuleSet>()
        for (const id of ids) {
            const set = new internal.RewriteRuleSet()
            set.id = id
            set.name = `upd${id}`
            updates[id] = set
        }
        return updates
    }

    afterEach(() => {
        jest.restoreAllMocks()
    })

    beforeEach(async () => {
        rwrMockRepo = new RewriteRuleSetMockRepository()
        redisMockRepo = new RewriteRuleSetMockRedisRepository(new TaskAgentMockHelper())
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, RewriteRuleSetModule, ExpandModule],
        })
            .overrideProvider(RewriteRuleSetMariadbRepository).useValue(rwrMockRepo)
            .overrideProvider(RewriteRuleSetRedisRepository).useValue(redisMockRepo)
            .compile()
        service = module.get<RewriteRuleSetService>(RewriteRuleSetService)

        reloadSpy = jest.spyOn(service, 'reloadDialPlanAfterCommit').mockImplementation(() => Promise.resolve())

        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(rwrMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of rewrite rule sets', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await rwrMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return a rewrite rule set by id', async () => {
            const result = await service.read(2, sr)
            expect(result).toStrictEqual(await rwrMockRepo.readById(2, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('create', () => {
        it('should return a valid rewrite rule set', async () => {
            const set5 = new internal.RewriteRuleSet()
            set5.id = 5
            set5.name = 'rwrset5'
            set5.description = 'desc5'
            const result = await service.create([set5], sr)
            expect(result[0]).toStrictEqual(await rwrMockRepo.readById(result[0].id, sr))
        })

        it('should keep the provided reseller_id for admin roles', async () => {
            const set = new internal.RewriteRuleSet()
            set.name = 'rwrset_admin'
            set.resellerId = 3
            const result = await service.create([set], sr)
            expect(result[0].resellerId).toEqual(3)
        })

        it('should set reseller_id of the user for reseller roles', async () => {
            sr.user = {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}
            const set = new internal.RewriteRuleSet()
            set.name = 'rwrset_reseller'
            const result = await service.create([set], sr)
            expect(result[0].resellerId).toEqual(1)
        })
    })

    describe('update', () => {
        it('should update rewrite rule set by id', async () => {
            const set1 = new internal.RewriteRuleSet()
            set1.id = 1
            set1.name = 'foo'
            set1.description = 'bar'
            const updates = new Dictionary<internal.RewriteRuleSet>()
            updates[set1.id] = set1
            const ids = await service.update(updates, sr)
            const got = await service.read(ids[0], sr)
            const want = await rwrMockRepo.readById(set1.id, sr)
            expect(got).toStrictEqual(want)
        })


        it('should throw an error if ID does not exist', async () => {
            const id = 100
            const updates = new Dictionary<internal.RewriteRuleSet>()
            updates[id] = new internal.RewriteRuleSet()
            await expect(service.update(updates, sr)).rejects.toThrow()
        })

        it('should set reseller_id of the user for reseller roles', async () => {
            sr.user = {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}
            const set1 = new internal.RewriteRuleSet()
            set1.id = 1
            set1.name = 'foo'
            set1.resellerId = null
            const updates = new Dictionary<internal.RewriteRuleSet>()
            updates[set1.id] = set1
            const ids = await service.update(updates, sr)
            const got = await service.read(ids[0], sr)
            expect(got.resellerId).toEqual(1)
        })
    })

    describe('adjust', () => {
        it('should update description', async () => {
            const id = 3
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/description', value: 'foobar'},
            ]

            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.RewriteRuleSet, RewriteRuleSetRequestDto>(oldEntity, patch, RewriteRuleSetRequestDto)
            const update = new Dictionary<internal.RewriteRuleSet>(id.toString(), entity)

            const got = await service.update(update, sr)
            expect(got[0] == id)
            const set = await service.read(id, sr)
            expect(set.description).toStrictEqual('foobar')
        })
    })

    describe('delete', () => {
        it('should return number of deleted items', async () => {
            const id = 2
            await service.delete([id], sr)
            // expect(result).toStrictEqual(1)
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.delete([id], sr)).rejects.toThrow()
        })
    })

    describe('reseller filtering', () => {
        beforeEach(() => {
            sr.user = resellerUser
        })

        it('readAll passes the reseller filter and returns own sets only', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'readAll')
            const [sets, count] = await service.readAll(sr)
            expect(spy).toHaveBeenCalledWith(sr, {resellerId: 1})
            expect(sets.map(s => s.id)).toStrictEqual([1, 4])
            expect(count).toEqual(2)
        })

        it('readAll passes an empty filter for admins', async () => {
            sr.user = user
            const spy = jest.spyOn(rwrMockRepo, 'readAll')
            const [sets] = await service.readAll(sr)
            expect(spy).toHaveBeenCalledWith(sr, {})
            expect(sets).toHaveLength(4)
        })

        it('read returns an own set', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'readById')
            const got = await service.read(1, sr)
            expect(got.id).toEqual(1)
            expect(spy).toHaveBeenCalledWith(1, sr, {resellerId: 1})
        })

        it('read throws NotFoundException for a set of another reseller', async () => {
            await expect(service.read(2, sr)).rejects.toThrow(NotFoundException)
        })

        it('update throws NotFoundException if no set belongs to the reseller', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'update')
            await expect(service.update(makeUpdates(2), sr)).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('delete throws NotFoundException if no set belongs to the reseller', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'delete')
            await expect(service.delete([2], sr)).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('delete queries with the reseller filter', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'readWhereInIds')
            await service.delete([1], sr)
            expect(spy).toHaveBeenCalledWith([1], sr, {resellerId: 1})
        })

        it('cleanSets throws NotFoundException for a set of another reseller', async () => {
            await expect(service.cleanSets([3], sr)).rejects.toThrow(ApiErrorException)
            expect(rwrMockRepo.cleaned).toHaveLength(0)
        })
    })

    describe('partial ids', () => {
        it('update throws UnprocessableEntityException and updates nothing if some ids are missing', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'update')
            await expect(service.update(makeUpdates(1, 100), sr)).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('delete throws UnprocessableEntityException and deletes nothing if some ids are missing', async () => {
            const spy = jest.spyOn(rwrMockRepo, 'delete')
            await expect(service.delete([1, 100], sr)).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
            expect(reloadSpy).not.toHaveBeenCalled()
        })

        it('cleanSets throws UnprocessableEntityException if some ids are missing', async () => {
            await expect(service.cleanSets([1, 100], sr)).rejects.toThrow(ApiErrorException)
            expect(rwrMockRepo.cleaned).toHaveLength(0)
        })

        it('updateWithRuleRecreation throws UnprocessableEntityException if some ids are missing', async () => {
            await expect(service.updateWithRuleRecreation(makeUpdates(1, 100), [], sr)).rejects.toThrow(ApiErrorException)
            expect(rwrMockRepo.cleaned).toHaveLength(0)
        })
    })

    describe('dial plan reload', () => {
        it('create reloads the dial plan', async () => {
            const set = new internal.RewriteRuleSet()
            set.name = 'reload'
            await service.create([set], sr)
            expect(reloadSpy).toHaveBeenCalledWith(sr)
        })

        it('delete reloads the dial plan', async () => {
            await service.delete([2], sr)
            expect(reloadSpy).toHaveBeenCalledWith(sr)
        })
    })

    describe('delete result', () => {
        it('returns the deleted ids and removes the set', async () => {
            await expect(service.delete([2, 3], sr)).resolves.toStrictEqual([2, 3])
            await expect(service.read(2, sr)).rejects.toThrow(NotFoundException)
        })
    })

    describe('updateWithRuleRecreation', () => {
        const rule = (): internal.RewriteRule => new internal.RewriteRule()

        it('cleans every updated set, creates the rules and reloads the dial plan', async () => {
            const rules = [rule(), rule()]
            const got = await service.updateWithRuleRecreation(makeUpdates(1, 2), rules, sr)
            expect(got).toStrictEqual([1, 2])
            expect(rwrMockRepo.cleaned).toStrictEqual([1, 2])
            expect(rwrMockRepo.createdRules).toStrictEqual(rules)
            expect(reloadSpy).toHaveBeenCalledTimes(1)
        })

        it.each([[[]], [undefined]])('does not create rules nor reload when rules are %p', async (rules) => {
            await service.updateWithRuleRecreation(makeUpdates(1), rules as internal.RewriteRule[], sr)
            expect(rwrMockRepo.cleaned).toStrictEqual([1])
            expect(rwrMockRepo.createdRules).toHaveLength(0)
            expect(reloadSpy).not.toHaveBeenCalled()
        })

        it('throws NotFoundException if no set exists', async () => {
            await expect(service.updateWithRuleRecreation(makeUpdates(100), [rule()], sr)).rejects.toThrow(ApiErrorException)
        })

        it('forces the reseller id of reseller users and filters by it', async () => {
            sr.user = resellerUser
            const updates = makeUpdates(1)
            updates[1].resellerId = 9
            await service.updateWithRuleRecreation(updates, [], sr)
            expect(updates[1].resellerId).toEqual(1)
            await expect(service.updateWithRuleRecreation(makeUpdates(2), [], sr)).rejects.toThrow(ApiErrorException)
        })
    })

    describe('cleanSets', () => {
        it('cleans all given sets', async () => {
            await service.cleanSets([1, 2], sr)
            expect(rwrMockRepo.cleaned).toStrictEqual([1, 2])
        })

        it('throws NotFoundException if no set exists', async () => {
            await expect(service.cleanSets([100], sr)).rejects.toThrow(ApiErrorException)
        })
    })

    describe('create reseller assignment', () => {
        it('sets the reseller id on every entity for reseller users', async () => {
            sr.user = resellerUser
            const a = new internal.RewriteRuleSet()
            const b = new internal.RewriteRuleSet()
            b.resellerId = 7
            const got = await service.create([a, b], sr)
            expect(got.map(s => s.resellerId)).toStrictEqual([1, 1])
        })
    })
})
