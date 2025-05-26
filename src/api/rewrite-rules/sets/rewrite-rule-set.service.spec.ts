import {Test, TestingModule} from '@nestjs/testing'

import {RewriteRuleSetRequestDto} from './dto/rewrite-rule-set-request.dto'
import {RewriteRuleSetMariadbRepository} from './repositories/rewrite-rule-set.mariadb.repository'
import {RewriteRuleSetMockRepository} from './repositories/rewrite-rule-set.mock.repository'
import {RewriteRuleSetMockRedisRepository} from './repositories/rewrite-rule-set.redis.mock.repository'
import {RewriteRuleSetRedisRepository} from './repositories/rewrite-rule-set.redis.repository'
import {RewriteRuleSetModule} from './rewrite-rule-set.module'
import {RewriteRuleSetService} from './rewrite-rule-set.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
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

    beforeEach(async () => {
        rwrMockRepo = new RewriteRuleSetMockRepository()
        redisMockRepo = new RewriteRuleSetMockRedisRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, RewriteRuleSetModule, ExpandModule],
        })
            .overrideProvider(RewriteRuleSetMariadbRepository).useValue(rwrMockRepo)
            .overrideProvider(RewriteRuleSetRedisRepository).useValue(redisMockRepo)
            .compile()
        service = module.get<RewriteRuleSetService>(RewriteRuleSetService)
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
})
