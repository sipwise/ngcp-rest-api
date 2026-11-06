import {NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {SubscriberPhonebookView} from './dto/phonebook-query.dto'
import {SubscriberPhonebookOptions} from './interfaces/phonebook-options.interface'
import {SubscriberPhonebookModule} from './phonebook.module'
import {SubscriberPhonebookService} from './phonebook.service'
import {SubscriberPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'
import {SubscriberPhonebookMockRepository} from './repositories/phonebook.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
import {ExpandModule} from '~/helpers/expand.module'
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

const resellerUser: AuthResponseDto = {...user, role: 'reseller', reseller_id: 2, reseller_id_required: true}
const subadminUser: AuthResponseDto = {...user, role: 'subscriberadmin', id: 1, customer_id: 4, reseller_id_required: false}
const subscriberUser: AuthResponseDto = {...user, role: 'subscriber', id: 1, customer_id: 4, reseller_id_required: false}

const makeSr = (u: AuthResponseDto, query?: object, params?: object): ServiceRequest =>
    ({returnContent: true, headers: [undefined], params, query, user: u, req: undefined} as unknown as ServiceRequest)

const makeEntity = (subscriberId: number | undefined, number: string): internal.SubscriberPhonebook =>
    internal.SubscriberPhonebook.create({name: `n${number}`, number, subscriberId, shared: false})

describe('subscriber phonebookService', () => {
    let service: SubscriberPhonebookService
    let phonebookMockRepo: SubscriberPhonebookMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        phonebookMockRepo = new SubscriberPhonebookMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [SubscriberPhonebookModule, ExpandModule, AppModule],
        })
            .overrideProvider(SubscriberPhonebookMariadbRepository).useValue(phonebookMockRepo)
            .compile()

        service = module.get<SubscriberPhonebookService>(SubscriberPhonebookService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(phonebookMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a phonebook by id', async () => {
            const options: SubscriberPhonebookOptions = {filterBy: {}}
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await phonebookMockRepo.readById(1, options))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of phonebooks', async () => {
            const options: SubscriberPhonebookOptions = {filterBy: {}}
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await phonebookMockRepo.readAll(options,sr))
        })
    })

    describe('create', () => {
        it('should create a valid phonebook', async () => {
            const options: SubscriberPhonebookOptions = {filterBy: {}}
            const result = await service.create([internal.SubscriberPhonebook.create({
                name: 'test_99',
                number: '991',
                subscriberId: 1,
                shared: false,
            })], sr)
            const phonebook = result[0]
            expect(phonebook).toStrictEqual(await phonebookMockRepo.readById(phonebook.id, options))
        })
        it('should throw an error if subscriber id does not exist', async () => {
            await expect(service.create([internal.SubscriberPhonebook.create({
                name: 'test_99',
                number: '991',
                subscriberId: 100,
                shared: false,
            })], sr)).rejects.toThrow(ApiErrorException)
        })
    })

    describe('update', () => {
        it('should update a phonebook by id', async () => {
            const options: SubscriberPhonebookOptions = {filterBy: {}}
            const id = 1
            const updates = new Dictionary<internal.SubscriberPhonebook>()
            updates[id] = internal.SubscriberPhonebook.create({
                id: 1,
                number: '111',
                name: 'foo',
                subscriberId: 1,
                shared: false,
            })
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await phonebookMockRepo.readById(Number(result.id), options))
        })
        it('should throw an error if changed subscriber id does not exist', async () => {
            const id = 2
            const updates = new Dictionary<internal.SubscriberPhonebook>()
            updates[id] = internal.SubscriberPhonebook.create({
                id: 2,
                subscriberId: 100,
                shared: false,
                name: 'foo',
                number: '111',
            })
            await expect(service.update(updates, sr)).rejects.toThrow(ApiErrorException)
        })
    })

    describe('delete', () => {
        describe('phonebook', () => {
            it('should delete a phonebook by id', async () => {
                const id = 1
                const result = await service.delete([id], sr)
                expect(result).toStrictEqual([1])
            })
        })
    })

    describe('options', () => {
        it('should not filter for admin without params', () => {
            expect(service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(user))).toStrictEqual(
                {filterBy: {subscriberId: undefined, resellerId: undefined, customerId: undefined}})
        })
        it('should filter by reseller id of a reseller user', () => {
            expect(service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(resellerUser)).filterBy.resellerId).toBe(2)
        })
        it('should filter by subscriber id param', () => {
            const options = service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(user, undefined, {subscriberId: '7'}))
            expect(options.filterBy.subscriberId).toBe(7)
        })
        it('should filter by own customer for subscriberadmin', () => {
            const options = service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(subadminUser))
            expect(options.filterBy.customerId).toBe(4)
            expect(options.filterBy.subscriberId).toBeUndefined()
        })
        it('should filter by own id for subscriber', () => {
            const options = service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(subscriberUser))
            expect(options.filterBy.subscriberId).toBe(1)
            expect(options.filterBy.customerId).toBeUndefined()
        })
        it('should accept the own subscriber id param for subscriber', () => {
            expect(() => service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(subscriberUser, undefined, {subscriberId: '1'})))
                .not.toThrow()
        })
        it('should throw NotFound if subscriber asks for another subscriber', () => {
            expect(() => service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(subscriberUser, undefined, {subscriberId: '9'})))
                .toThrow(NotFoundException)
        })
        it('should take the view from include', () => {
            const options = service.getSubscriberPhonebookOptionsFromServiceRequest(makeSr(user, {include: 'customer'}))
            expect(options.view).toBe(SubscriberPhonebookView.Customer)
        })
    })

    describe('readAll views', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it.each([
            ['all', 'readAllFromViewAll'],
            ['customer', 'readAllFromViewContract'],
            ['reseller', 'readAllFromViewReseller'],
        ] as const)('should use the %s view and drop include from the query', async (include, method) => {
            const spy = jest.spyOn(phonebookMockRepo, method)
            const req = makeSr(user, {include})
            await service.readAll(req)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(req.query['include']).toBeUndefined()
        })
        it('should use the all view for own=true', async () => {
            const all = jest.spyOn(phonebookMockRepo, 'readAllFromViewAll')
            await service.readAll(makeSr(user, {own: 'true'}))
            expect(all).toHaveBeenCalledTimes(1)
        })
        it('should pass the scope filters to the repository', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readAll')
            await service.readAll(makeSr(subscriberUser))
            expect(spy.mock.calls[0][0].filterBy.subscriberId).toBe(1)
        })
    })

    describe('read views', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it.each([
            ['all', 'readByIdFromViewAll'],
            ['customer', 'readByIdFromViewContract'],
            ['reseller', 'readByIdFromViewReseller'],
        ] as const)('should use the %s view', async (include, method) => {
            const spy = jest.spyOn(phonebookMockRepo, method)
            const req = makeSr(user, {include})
            await service.read('1', req)
            expect(spy).toHaveBeenCalledWith('1', expect.anything(), req)
            expect(req.query['include']).toBeUndefined()
        })
        it('should throw NotFound for a non numeric id without view', async () => {
            await expect(service.read('abc', makeSr(user))).rejects.toThrow(NotFoundException)
        })
        it('should use the all view for own=true', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readByIdFromViewAll')
            await service.read(1, makeSr(user, {own: 'true'}))
            expect(spy).toHaveBeenCalledWith('1', expect.anything(), expect.anything())
        })
        it('should throw NotFound for an unknown id', async () => {
            await expect(service.read(100, makeSr(user))).rejects.toThrow(NotFoundException)
        })
    })

    describe('create access', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should default the subscriber id to the user for subscriber', async () => {
            const allowed = jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds')
            const entity = makeEntity(undefined, '801')
            await service.create([entity], makeSr(subscriberUser))
            expect(entity.subscriberId).toBe(1)
            expect(allowed.mock.calls[0][0]).toStrictEqual([1])
            expect(allowed.mock.calls[0][1].subscriberId).toBe(1)
        })
        it('should default the subscriber id to the user for subscriberadmin and keep a given one', async () => {
            const given = makeEntity(3, '802')
            const missing = makeEntity(undefined, '803')
            const allowed = jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([1, 3])
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            await service.create([given, missing], makeSr(subadminUser))
            expect(given.subscriberId).toBe(3)
            expect(missing.subscriberId).toBe(1)
            expect(allowed.mock.calls[0][0]).toStrictEqual([1, 3])
            expect(allowed.mock.calls[0][1].customerId).toBe(4)
        })
        it('should not default the subscriber id for admin', async () => {
            const entity = makeEntity(undefined, '804')
            jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([])
            await expect(service.create([entity], makeSr(user))).rejects.toThrow(UnprocessableEntityException)
            expect(entity.subscriberId).toBeUndefined()
        })
        it('should count each subscriber id once', async () => {
            const allowed = jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds')
            await service.create([makeEntity(1, '805'), makeEntity(1, '806')], makeSr(user))
            expect(allowed.mock.calls[0][0]).toStrictEqual([1])
        })
        it('should reject if a subscriber is not allowed and not create anything', async () => {
            jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([])
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.create([makeEntity(1, '807')], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should pass the reseller filter to the allowed check', async () => {
            const allowed = jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds')
            await service.create([makeEntity(1, '808')], makeSr(resellerUser))
            expect(allowed.mock.calls[0][1].resellerId).toBe(2)
        })
    })

    describe('update and delete counts', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        const updates = (subscriberId = 1): Dictionary<internal.SubscriberPhonebook> => {
            const d = new Dictionary<internal.SubscriberPhonebook>()
            d[1] = internal.SubscriberPhonebook.create({id: 1, name: 'a', number: '1', subscriberId, shared: false})
            d[2] = internal.SubscriberPhonebook.create({id: 2, name: 'b', number: '2', subscriberId, shared: false})
            return d
        }

        it('update: should throw 422 for every id if no id is visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readExistingIds').mockResolvedValue([])
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(updates(), makeSr(user))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('update: should throw 422 if only some ids are visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readExistingIds').mockResolvedValue([1])
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(updates(), makeSr(user))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('update: should pass the scope filter to the count', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readExistingIds')
            await service.update(updates(), makeSr(subscriberUser))
            expect(spy.mock.calls[0][0]).toStrictEqual([1, 2])
            expect(spy.mock.calls[0][1].filterBy.subscriberId).toBe(1)
        })
        it('delete: should throw 422 for every id if no id is visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readExistingIds').mockResolvedValue([])
            await expect(service.delete([1, 2], makeSr(user))).rejects.toThrow(ApiErrorException)
        })
        it('delete: should throw 422 if only some ids are visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readExistingIds').mockResolvedValue([1])
            const spy = jest.spyOn(phonebookMockRepo, 'delete')
            await expect(service.delete([1, 2], makeSr(user))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('delete: should delete several ids', async () => {
            await expect(service.delete([1, 2], makeSr(user))).resolves.toStrictEqual([1, 2])
        })

        it('update: should reject moving an entry to a subscriber outside the user scope', async () => {
            jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([])
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(updates(9), makeSr(subscriberUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('importCsv', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should reject duplicate subscriber/number pairs', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(1, '5'), makeEntity(1, '5')], makeSr(user)))
                .rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should reject subscriber importing for another subscriber', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(2, '5')], makeSr(subscriberUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should reject subscriberadmin importing for a subscriber outside its customer', async () => {
            const allowed = jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([])
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(2, '5')], makeSr(subadminUser))).rejects.toThrow(ApiErrorException)
            expect(allowed.mock.calls[0][0]).toStrictEqual([2])
            expect(allowed.mock.calls[0][1]).toMatchObject({customerId: 4})
            expect(spy).not.toHaveBeenCalled()
        })
        it('should allow subscriberadmin importing for a subscriber of its customer', async () => {
            jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([3])
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            await expect(service.importCsv([makeEntity(3, '5')], makeSr(subadminUser))).resolves.toHaveLength(1)
        })
        it('should allow subscriber importing for itself', async () => {
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            await expect(service.importCsv([makeEntity(1, '5')], makeSr(subscriberUser))).resolves.toHaveLength(1)
        })
        it('should purge each subscriber once for purge_existing=true and drop the flag', async () => {
            const purge = jest.spyOn(phonebookMockRepo, 'purge')
            jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([1, 2])
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            const req = makeSr(user, {purge_existing: 'true'})
            await service.importCsv([makeEntity(1, '5'), makeEntity(1, '6'), makeEntity(2, '7')], req)
            expect(purge.mock.calls.map(c => c[0]).sort()).toStrictEqual([1, 2])
            expect(req.query['purge_existing']).toBeUndefined()
        })
        it('should not purge for purge_existing=false and drop the flag', async () => {
            const purge = jest.spyOn(phonebookMockRepo, 'purge')
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            const req = makeSr(user, {purge_existing: 'false'})
            await service.importCsv([makeEntity(1, '5')], req)
            expect(purge).not.toHaveBeenCalled()
            expect(req.query['purge_existing']).toBeUndefined()
        })

        it('should reject importing for subscribers outside the reseller scope', async () => {
            jest.spyOn(phonebookMockRepo, 'getAllowedSubscriberIds').mockResolvedValue([])
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(9, '5')], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('exportCsv', () => {
        it('should return a csv attachment with the entries and without resource_url', async () => {
            const file = await service.exportCsv(makeSr(user))
            expect(file).toBeInstanceOf(StreamableFile)
            const headers = file.getHeaders()
            expect(headers.type).toBe('text/csv')
            expect(headers.disposition).toBe('attachment; filename="subscriber_phonebook.csv"')
            let csv = ''
            for await (const chunk of file.getStream()) {
                csv += chunk.toString()
            }
            const [header] = csv.split(/\r?\n/)
            expect(header).toContain('subscriber_id')
            expect(header).toContain('number')
            expect(header).not.toContain('resource')
            expect(csv).toContain('test4')
        })
    })
})
