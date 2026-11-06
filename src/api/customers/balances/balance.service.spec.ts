import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {CustomerBalanceModule} from './balance.module'
import {CustomerBalanceService} from './balance.service'
import {CustomerBalanceMariadbRepository} from './repositories/balance.mariadb.repository'
import {CustomerBalanceMockRepository} from './repositories/balance.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
import {ExpandModule} from '~/helpers/expand.module'
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

const resellerUser: AuthResponseDto = {...admin, id: 2, role: 'reseller', reseller_id: 1, reseller_id_required: true}

describe('CustomerBalanceService', () => {
    let service: CustomerBalanceService
    let balanceMockRepo: CustomerBalanceMockRepository

    const makeSr = (user: AuthResponseDto = admin, params?: {[key: string]: string}): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params,
        query: {},
        user,
        req: undefined,
    })

    const updates = (data: {[id: number]: internal.ContractBalance}): Dictionary<internal.ContractBalance> => {
        const dict = new Dictionary<internal.ContractBalance>()
        for (const id of Object.keys(data))
            dict[id] = data[id]
        return dict
    }

    beforeEach(async () => {
        balanceMockRepo = new CustomerBalanceMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [CustomerBalanceModule, ExpandModule, AppModule],
        })
            .overrideProvider(CustomerBalanceMariadbRepository).useValue(balanceMockRepo)
            .compile()

        service = module.get<CustomerBalanceService>(CustomerBalanceService)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(balanceMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('returns all balances for an admin without filters', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readAll')
            const [result, count] = await service.readAll(makeSr())
            expect(count).toEqual(3)
            expect(result.map(b => b.id)).toEqual([1, 2, 3])
            expect(spy).toHaveBeenCalledWith(expect.anything(), {})
        })

        it('filters by the reseller of a reseller user', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readAll')
            const [result, count] = await service.readAll(makeSr(resellerUser))
            expect(count).toEqual(2)
            expect(result.map(b => b.id)).toEqual([1, 2])
            expect(spy).toHaveBeenCalledWith(expect.anything(), {resellerId: 1})
        })

        it('filters by the customerId route param', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readAll')
            const [result] = await service.readAll(makeSr(admin, {customerId: '2'}))
            expect(result.map(b => b.id)).toEqual([2])
            expect(spy).toHaveBeenCalledWith(expect.anything(), {customerId: 2})
        })

        it('combines the customerId param and the reseller filter', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readAll')
            const [result, count] = await service.readAll(makeSr(resellerUser, {customerId: '3'}))
            expect(count).toEqual(0)
            expect(result).toEqual([])
            expect(spy).toHaveBeenCalledWith(expect.anything(), {customerId: 3, resellerId: 1})
        })

        it('ignores a missing or empty customerId param', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readAll')
            await service.readAll(makeSr(admin, {customerId: ''}))
            expect(spy).toHaveBeenCalledWith(expect.anything(), {})
        })
    })

    describe('read', () => {
        it('returns a balance for an admin', async () => {
            const result = await service.read(3, makeSr())
            expect(result.id).toEqual(3)
        })

        it('returns a balance of the own reseller', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readById')
            const result = await service.read(1, makeSr(resellerUser))
            expect(result.id).toEqual(1)
            expect(spy).toHaveBeenCalledWith(1, expect.anything(), {resellerId: 1})
        })

        it('throws NotFoundException for a balance of another reseller', async () => {
            await expect(service.read(3, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException for an unknown id', async () => {
            await expect(service.read(99, makeSr())).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException when the balance is not of the customerId param', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readById')
            await expect(service.read(1, makeSr(admin, {customerId: '2'}))).rejects.toThrow(NotFoundException)
            expect(spy).toHaveBeenCalledWith(1, expect.anything(), {customerId: 2})
        })
    })

    describe('update', () => {
        it('updates the balances and returns the ids', async () => {
            const result = await service.update(updates({1: internal.ContractBalance.create({cashBalance: 55})}), makeSr())
            expect(result).toEqual([1])
            expect(balanceMockRepo.balanceDB[1].cashBalance).toEqual(55)
        })

        it('updates several balances', async () => {
            const result = await service.update(updates({
                1: internal.ContractBalance.create({cashBalance: 1}),
                3: internal.ContractBalance.create({freeTimeBalance: 2}),
            }), makeSr())
            expect(result).toEqual([1, 3])
        })

        it('reads the balances of the own reseller for a reseller user', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readWhereInIds')
            await service.update(updates({2: internal.ContractBalance.create({cashBalance: 5})}), makeSr(resellerUser))
            expect(spy).toHaveBeenCalledWith([2], expect.anything(), {resellerId: 1})
        })

        it('reads without a filter for an admin', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'readWhereInIds')
            await service.update(updates({2: internal.ContractBalance.create({cashBalance: 5})}), makeSr())
            expect(spy).toHaveBeenCalledWith([2], expect.anything())
        })

        it('throws NotFoundException when no id exists', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'update')
            await expect(service.update(updates({98: internal.ContractBalance.create({cashBalance: 5})}), makeSr()))
                .rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('throws NotFoundException when the only balance belongs to another reseller', async () => {
            await expect(service.update(updates({3: internal.ContractBalance.create({cashBalance: 5})}), makeSr(resellerUser)))
                .rejects.toThrow(ApiErrorException)
            expect(balanceMockRepo.balanceDB[3].cashBalance).toEqual(30)
        })

        it('throws UnprocessableEntityException listing the missing ids when only some exist', async () => {
            const spy = jest.spyOn(balanceMockRepo, 'update')
            const promise = service.update(updates({
                1: internal.ContractBalance.create({cashBalance: 5}),
                99: internal.ContractBalance.create({cashBalance: 5}),
            }), {...makeSr(), req: {body: {1: {}, 99: {}}}} as ServiceRequest)
            await expect(promise).rejects.toThrow(ApiErrorException)
            await promise.catch(e => expect(JSON.stringify(e.getResponse())).toContain('"pointer":"/99"'))
            expect(spy).not.toHaveBeenCalled()
            expect(balanceMockRepo.balanceDB[1].cashBalance).toEqual(10)
        })

        it('throws UnprocessableEntityException when a part of the ids belongs to another reseller', async () => {
            await expect(service.update(updates({
                1: internal.ContractBalance.create({cashBalance: 5}),
                3: internal.ContractBalance.create({cashBalance: 5}),
            }), makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            expect(balanceMockRepo.balanceDB[1].cashBalance).toEqual(10)
        })
    })
})
