import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {CustomerSpeedDialModule} from './customer-speed-dial.module'
import {CustomerSpeedDialService} from './customer-speed-dial.service'
import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'
import {CustomerSpeedDialMockRepository} from './repositories/customer-speed-dial.mock.repository'

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
const ccareUser: AuthResponseDto = {...resellerUser, id: 3, role: 'ccare'}
const subscriberAdmin: AuthResponseDto = {...resellerUser, id: 4, role: 'subscriberadmin', customer_id: 1}

describe('CustomerSpeedDialService', () => {
    let service: CustomerSpeedDialService
    let csdMockRepo: CustomerSpeedDialMockRepository

    const makeSr = (user: AuthResponseDto = admin): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params: undefined,
        query: {},
        user,
        req: undefined,
    })

    const newCsd = (data: Partial<internal.CustomerSpeedDial>): internal.CustomerSpeedDial =>
        Object.assign(new internal.CustomerSpeedDial(), {slot: '*9', destination: 'sip:x@example.org', ...data})

    const updates = (data: {[id: number]: internal.CustomerSpeedDial}): Dictionary<internal.CustomerSpeedDial> => {
        const dict = new Dictionary<internal.CustomerSpeedDial>()
        for (const id of Object.keys(data))
            dict[id] = data[id]
        return dict
    }

    beforeEach(async () => {
        csdMockRepo = new CustomerSpeedDialMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [CustomerSpeedDialModule, ExpandModule, AppModule],
        })
            .overrideProvider(CustomerSpeedDialMariadbRepository).useValue(csdMockRepo)
            .compile()

        service = module.get<CustomerSpeedDialService>(CustomerSpeedDialService)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(csdMockRepo).toBeDefined()
    })

    describe('create', () => {
        it('creates a speed dial with a sip: destination unchanged', async () => {
            const [result] = await service.create([newCsd({contractId: 1})], makeSr())
            expect(result.id).toEqual(4)
            expect(result.destination).toEqual('sip:x@example.org')
        })

        it('creates several speed dials', async () => {
            const result = await service.create([newCsd({contractId: 1, slot: '*8'}), newCsd({contractId: 2, slot: '*7'})], makeSr())
            expect(result.map(c => c.slot)).toEqual(['*8', '*7'])
        })

        it('completes a plain destination with the domain of the pilot subscriber', async () => {
            const spy = jest.spyOn(csdMockRepo, 'readSubscriberDomain')
            const [result] = await service.create([newCsd({contractId: 1, destination: '4311'})], makeSr())
            expect(result.destination).toEqual('sip:4311@pilot.example.org')
            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy).toHaveBeenCalledWith(1, {isPilot: true})
        })

        it('falls back to the domain of a non-pilot subscriber', async () => {
            const spy = jest.spyOn(csdMockRepo, 'readSubscriberDomain')
            const [result] = await service.create([newCsd({contractId: 2, destination: '4312'})], makeSr())
            expect(result.destination).toEqual('sip:4312@sub2.example.org')
            expect(spy).toHaveBeenNthCalledWith(1, 2, {isPilot: true})
            expect(spy).toHaveBeenNthCalledWith(2, 2, {isPilot: false})
        })

        it('treats a destination only containing sip: later in the string as plain', async () => {
            const [result] = await service.create([newCsd({contractId: 1, destination: 'xsip:4311'})], makeSr())
            expect(result.destination).toEqual('sip:xsip:4311@pilot.example.org')
        })

        it('throws ForbiddenException when the customer has no subscriber', async () => {
            const spy = jest.spyOn(csdMockRepo, 'create')
            await expect(service.create([newCsd({contractId: 3, destination: '4313'})], makeSr()))
                .rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('throws NotFoundException for an unknown customer', async () => {
            await expect(service.create([newCsd({contractId: 99})], makeSr())).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException for a customer of another reseller', async () => {
            await expect(service.create([newCsd({contractId: 3})], makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })

        it('allows a customer of another reseller for an admin', async () => {
            const [result] = await service.create([newCsd({contractId: 3})], makeSr())
            expect(result.contractId).toEqual(3)
        })

        it('throws NotFoundException for a subscriberadmin creating for another customer', async () => {
            await expect(service.create([newCsd({contractId: 2})], makeSr(subscriberAdmin))).rejects.toThrow(NotFoundException)
        })

        it('allows a subscriberadmin to create for the own customer', async () => {
            const [result] = await service.create([newCsd({contractId: 1})], makeSr(subscriberAdmin))
            expect(result.contractId).toEqual(1)
        })

        it('creates nothing when a later entity fails the permission check', async () => {
            const spy = jest.spyOn(csdMockRepo, 'create')
            await expect(service.create([newCsd({contractId: 1}), newCsd({contractId: 3})], makeSr(resellerUser)))
                .rejects.toThrow(NotFoundException)
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('readAll', () => {
        it('returns all for an admin without filters', async () => {
            const spy = jest.spyOn(csdMockRepo, 'readAll')
            const [result, count] = await service.readAll(makeSr())
            expect(count).toEqual(3)
            expect(result.length).toEqual(3)
            expect(spy).toHaveBeenCalledWith(expect.anything())
        })

        it.each([['reseller', resellerUser], ['ccare', ccareUser]])('filters by reseller for %s', async (_role, user) => {
            const spy = jest.spyOn(csdMockRepo, 'readAll')
            const [result] = await service.readAll(makeSr(user))
            expect(result.map(c => c.id)).toEqual([1, 2])
            expect(spy).toHaveBeenCalledWith(expect.anything(), {resellerId: 1})
        })

        it('filters by customer for a subscriberadmin', async () => {
            const spy = jest.spyOn(csdMockRepo, 'readAll')
            const [result] = await service.readAll(makeSr(subscriberAdmin))
            expect(result.map(c => c.id)).toEqual([1])
            expect(spy).toHaveBeenCalledWith(expect.anything(), {customerId: 1})
        })
    })

    describe('read', () => {
        it('returns any speed dial for an admin', async () => {
            expect((await service.read(3, makeSr())).id).toEqual(3)
        })

        it('returns a speed dial of the own reseller', async () => {
            expect((await service.read(2, makeSr(resellerUser))).id).toEqual(2)
            expect((await service.read(2, makeSr(ccareUser))).id).toEqual(2)
        })

        it('throws NotFoundException for a speed dial of another reseller', async () => {
            await expect(service.read(3, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
            await expect(service.read(3, makeSr(ccareUser))).rejects.toThrow(NotFoundException)
        })

        it('returns the own customer speed dial for a subscriberadmin', async () => {
            expect((await service.read(1, makeSr(subscriberAdmin))).id).toEqual(1)
        })

        it('throws NotFoundException for a speed dial of another customer for a subscriberadmin', async () => {
            await expect(service.read(2, makeSr(subscriberAdmin))).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException for an unknown id', async () => {
            await expect(service.read(99, makeSr())).rejects.toThrow(NotFoundException)
        })
    })

    describe('update', () => {
        it('updates a speed dial', async () => {
            const result = await service.update(updates({1: newCsd({contractId: 1, slot: '*5'})}), makeSr())
            expect(result).toEqual([1])
            expect(csdMockRepo.csdDB[1].slot).toEqual('*5')
        })

        it('completes a plain destination with the subscriber domain', async () => {
            await service.update(updates({1: newCsd({contractId: 1, destination: '4400'})}), makeSr())
            expect(csdMockRepo.csdDB[1].destination).toEqual('sip:4400@pilot.example.org')
        })

        it('throws ForbiddenException for a plain destination of a customer without subscribers', async () => {
            await expect(service.update(updates({3: newCsd({contractId: 3, destination: '4400'})}), makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('throws NotFoundException when moving to a customer of another reseller', async () => {
            const spy = jest.spyOn(csdMockRepo, 'update')
            await expect(service.update(updates({1: newCsd({contractId: 3})}), makeSr(resellerUser)))
                .rejects.toThrow(NotFoundException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('throws NotFoundException for a subscriberadmin updating for another customer', async () => {
            await expect(service.update(updates({1: newCsd({contractId: 2})}), makeSr(subscriberAdmin)))
                .rejects.toThrow(NotFoundException)
        })

        it('allows a subscriberadmin to update the own customer speed dial', async () => {
            expect(await service.update(updates({1: newCsd({contractId: 1, slot: '*6'})}), makeSr(subscriberAdmin))).toEqual([1])
        })

        it('rejects an update of a speed dial of another reseller even with an own customer id in the body', async () => {
            await expect(service.update(updates({3: newCsd({contractId: 1, slot: '*6'})}), makeSr(resellerUser)))
                .rejects.toThrow(ApiErrorException)
            expect(csdMockRepo.csdDB[3].contractId).toEqual(3)
        })
    })

    describe('delete', () => {
        it('deletes speed dials', async () => {
            expect(await service.delete([1, 2], makeSr())).toEqual([1, 2])
            expect(csdMockRepo.csdDB[1]).toBeUndefined()
            expect(csdMockRepo.csdDB[2]).toBeUndefined()
        })

        it('throws UnprocessableEntityException when an id does not exist', async () => {
            const spy = jest.spyOn(csdMockRepo, 'delete')
            await expect(service.delete([1, 99], makeSr())).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })

        it('throws NotFoundException for a speed dial of another reseller', async () => {
            await expect(service.delete([3], makeSr(resellerUser))).rejects.toThrow(NotFoundException)
            expect(csdMockRepo.csdDB[3]).toBeDefined()
        })

        it('deletes nothing when one of several belongs to another reseller', async () => {
            await expect(service.delete([1, 3], makeSr(resellerUser))).rejects.toThrow(NotFoundException)
            expect(csdMockRepo.csdDB[1]).toBeDefined()
        })

        it('throws NotFoundException for a subscriberadmin deleting a speed dial of another customer', async () => {
            await expect(service.delete([2], makeSr(subscriberAdmin))).rejects.toThrow(NotFoundException)
        })

        it('allows a subscriberadmin to delete the own customer speed dial', async () => {
            expect(await service.delete([1], makeSr(subscriberAdmin))).toEqual([1])
        })
    })
})
