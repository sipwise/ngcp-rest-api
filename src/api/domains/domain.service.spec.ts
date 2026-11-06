import {ForbiddenException, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {DomainModule} from './domain.module'
import {DomainService} from './domain.service'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'
import {DomainMockRepository} from './repositories/domain.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {deepCopy} from '~/helpers/deep-copy.helper'
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

const resellerUser: AuthResponseDto = {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}

describe('DomainService', () => {
    let service: DomainService
    let domainMockRepo: DomainMockRepository

    let sr: ServiceRequest

    const makeDomain = (name: string, resellerId?: number): internal.Domain => {
        const d = new internal.Domain()
        d.domain = name
        d.reseller_id = resellerId
        return d
    }

    afterEach(() => {
        jest.restoreAllMocks()
    })

    beforeEach(async () => {
        domainMockRepo = new DomainMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [DomainModule, AppModule],
        })
            .overrideProvider(DomainMariadbRepository).useValue(domainMockRepo)
            .compile()

        service = module.get<DomainService>(DomainService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(domainMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of domains', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await domainMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return domain by id', async () => {
            const got = await service.read(1, sr)
            expect(got).toStrictEqual(await domainMockRepo.readById(1, sr))
        })
    })

    describe('delete', () => {
        it('should delete domain by id', async () => {
            const id = 1
            const got = await service.delete([id], sr)
            expect(got).toStrictEqual([id])
        })

        it('should throw ForbiddenException when accessing non-existing id', async () => {
            await expect(service.delete([5], sr)).rejects.toThrow()
        })

        it('should not allow deleting domain with different reseller_id as reseller', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id_required = true
            localRequest.user.reseller_id = 5
            await expect(service.delete([1], localRequest)).rejects.toThrow()
        })
    })

    describe('create', () => {
        it('creates domains of an admin with the given reseller_id', async () => {
            const spy = jest.spyOn(domainMockRepo, 'create')
            const got = await service.create([makeDomain('new1', 2), makeDomain('new2', 3)], sr)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(got.map(d => [d.domain, d.reseller_id])).toStrictEqual([['new1', 2], ['new2', 3]])
        })

        it('rejects an unknown reseller_id with 422 for admins', async () => {
            const spy = jest.spyOn(domainMockRepo, 'create')
            await expect(service.create([makeDomain('new1', 99)], sr)).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('rejects an existing domain name with 422 for admins', async () => {
            const spy = jest.spyOn(domainMockRepo, 'create')
            await expect(service.create([makeDomain('domain1', 1)], sr)).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('does not create anything if one of several domains is invalid', async () => {
            const spy = jest.spyOn(domainMockRepo, 'create')
            await expect(service.create([makeDomain('ok', 1), makeDomain('domain2', 1)], sr)).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('forces the reseller_id of reseller users', async () => {
            const rsr = {...sr, user: resellerUser}
            const got = await service.create([makeDomain('res1', 3), makeDomain('res2')], rsr)
            expect(got.map(d => d.reseller_id)).toStrictEqual([1, 1])
        })

        it('rejects an existing domain name with 422 for resellers', async () => {
            const rsr = {...sr, user: resellerUser}
            await expect(service.create([makeDomain('domain3')], rsr)).rejects.toThrow(UnprocessableEntityException)
        })

        it('rejects a reseller user whose reseller does not exist', async () => {
            const rsr = {...sr, user: {...resellerUser, reseller_id: 99}}
            await expect(service.create([makeDomain('res1')], rsr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('read errors', () => {
        it('throws NotFoundException for an unknown id', async () => {
            await expect(service.read(100, sr)).rejects.toThrow(NotFoundException)
        })
    })

    describe('delete branches', () => {
        it('throws UnprocessableEntityException and deletes nothing if some ids are missing', async () => {
            const spy = jest.spyOn(domainMockRepo, 'delete')
            await expect(service.delete([1, 100], sr)).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('throws ForbiddenException for a reseller deleting a foreign domain', async () => {
            const spy = jest.spyOn(domainMockRepo, 'delete')
            await expect(service.delete([2], {...sr, user: resellerUser})).rejects.toThrow(ForbiddenException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('lets a reseller delete its own domains', async () => {
            await expect(service.delete([1, 4], {...sr, user: resellerUser})).resolves.toStrictEqual([1, 4])
        })

        it('does not check ownership for admins', async () => {
            await expect(service.delete([2, 3], sr)).resolves.toStrictEqual([2, 3])
        })

        it('deletes domains one by one by id', async () => {
            const spy = jest.spyOn(domainMockRepo, 'delete')
            await service.delete([1, 2], sr)
            expect(spy).toHaveBeenNthCalledWith(1, 1, sr)
            expect(spy).toHaveBeenNthCalledWith(2, 2, sr)
        })
    })

})
