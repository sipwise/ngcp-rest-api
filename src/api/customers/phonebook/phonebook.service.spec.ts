import {NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {CustomerPhonebookView} from '~/api/customers/phonebook/dto/phonebook-query.dto'
import {CustomerPhonebookOptions} from '~/api/customers/phonebook/interfaces/phonebook-options.interface'
import {CustomerPhonebookModule} from '~/api/customers/phonebook/phonebook.module'
import {CustomerPhonebookService} from '~/api/customers/phonebook/phonebook.service'
import {CustomerPhonebookMariadbRepository} from '~/api/customers/phonebook/repositories/phonebook.mariadb.repository'
import {CustomerPhonebookMockRepository} from '~/api/customers/phonebook/repositories/phonebook.mock.repository'
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
const subadminUser: AuthResponseDto = {...user, role: 'subscriberadmin', id: 50, customer_id: 1, reseller_id_required: false}

const makeSr = (u: AuthResponseDto, query?: object, params?: object): ServiceRequest =>
    ({returnContent: true, headers: [undefined], params, query, user: u, req: undefined} as unknown as ServiceRequest)

const makeEntity = (contractId: number, number: string): internal.CustomerPhonebook =>
    internal.CustomerPhonebook.create({name: `n${number}`, number, contractId})

describe('customer phonebookService', () => {
    let service: CustomerPhonebookService
    let phonebookMockRepo: CustomerPhonebookMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        phonebookMockRepo = new CustomerPhonebookMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [CustomerPhonebookModule, ExpandModule, AppModule],
        })
            .overrideProvider(CustomerPhonebookMariadbRepository).useValue(phonebookMockRepo)
            .compile()

        service = module.get<CustomerPhonebookService>(CustomerPhonebookService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(phonebookMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a phonebook by id', async () => {
            const options: CustomerPhonebookOptions = {filterBy: {}}
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
            const options: CustomerPhonebookOptions = {filterBy: {}}
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await phonebookMockRepo.readAll(options,sr))
        })
    })

    describe('create', () => {
        it('should create a valid phonebook', async () => {
            const options: CustomerPhonebookOptions = {filterBy: {}}
            const result = await service.create([internal.CustomerPhonebook.create({
                name: 'test_99',
                number: '991',
                contractId: 1,
            })], sr)
            const phonebook = result[0]
            expect(phonebook).toStrictEqual(await phonebookMockRepo.readById(phonebook.id, options))
        })
        it('should throw an error if contract_id does not exist', async () => {
            await expect(service.create([internal.CustomerPhonebook.create({
                name: 'test_99',
                number: '991',
                contractId: 100,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('update', () => {
        it('should update a phonebook by id', async () => {
            const options: CustomerPhonebookOptions = {filterBy: {}}
            const id = 1
            const updates = new Dictionary<internal.CustomerPhonebook>()
            updates[id] = internal.CustomerPhonebook.create({
                id: 1,
                number: '111',
                name: 'foo',
                contractId: 1,
            })
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await phonebookMockRepo.readById(Number(result.id), options))
        })
        it('should throw an error if changed contract_id does not exist', async () => {
            const id = 2
            const updates = new Dictionary<internal.CustomerPhonebook>()
            updates[id] = internal.CustomerPhonebook.create({
                id: 2,
                contractId: 100,
                name: 'foo',
                number: '111',
            })
            await expect(service.update(updates, sr)).rejects.toThrow(UnprocessableEntityException)
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
            expect(service.getCustomerPhonebookOptionsFromServiceRequest(makeSr(user))).toStrictEqual(
                {filterBy: {resellerId: undefined, customerId: undefined}})
        })
        it('should filter by reseller id of a reseller user', () => {
            const options = service.getCustomerPhonebookOptionsFromServiceRequest(makeSr(resellerUser))
            expect(options.filterBy.resellerId).toBe(2)
        })
        it('should filter by customer id param', () => {
            const options = service.getCustomerPhonebookOptionsFromServiceRequest(makeSr(user, undefined, {customerId: '7'}))
            expect(options.filterBy.customerId).toBe(7)
        })
        it('should filter by own customer for subscriberadmin', () => {
            const options = service.getCustomerPhonebookOptionsFromServiceRequest(makeSr(subadminUser))
            expect(options.filterBy.customerId).toBe(1)
        })
        it('should throw NotFound if subscriberadmin asks for another customer', () => {
            expect(() => service.getCustomerPhonebookOptionsFromServiceRequest(makeSr(subadminUser, undefined, {customerId: '9'})))
                .toThrow(NotFoundException)
        })
        it('should take the view from include', () => {
            const options = service.getCustomerPhonebookOptionsFromServiceRequest(makeSr(user, {include: 'shared'}))
            expect(options.view).toBe(CustomerPhonebookView.Shared)
        })
    })

    describe('readAll views', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it.each([
            ['all', 'readAllFromViewAll'],
            ['shared', 'readAllFromViewShared'],
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
        it('should pass the reseller filter to the repository', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readAll')
            await service.readAll(makeSr(resellerUser))
            expect(spy.mock.calls[0][0].filterBy.resellerId).toBe(2)
        })
    })

    describe('read views', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it.each([
            ['all', 'readByIdFromViewAll'],
            ['shared', 'readByIdFromViewShared'],
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

        it('should reject subscriberadmin creating for another customer', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.create([makeEntity(2, '901')], makeSr(subadminUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should reject if any of several entities is for another customer', async () => {
            await expect(service.create([makeEntity(1, '902'), makeEntity(2, '903')], makeSr(subadminUser)))
                .rejects.toThrow(ApiErrorException)
        })
        it('should allow subscriberadmin creating for own customer', async () => {
            const result = await service.create([makeEntity(1, '904')], makeSr(subadminUser))
            expect(result).toHaveLength(1)
        })
    })

    describe('update and delete counts', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        const updates = (): Dictionary<internal.CustomerPhonebook> => {
            const d = new Dictionary<internal.CustomerPhonebook>()
            d[1] = internal.CustomerPhonebook.create({id: 1, name: 'a', number: '1', contractId: 1})
            d[2] = internal.CustomerPhonebook.create({id: 2, name: 'b', number: '2', contractId: 1})
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
        it('update: should pass the reseller filter to the id check', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readExistingIds')
            await service.update(updates(), makeSr(resellerUser))
            expect(spy.mock.calls[0][0]).toStrictEqual([1, 2])
            expect(spy.mock.calls[0][1].filterBy.resellerId).toBe(2)
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

        it('update: should reject subscriberadmin moving an entry to another customer', async () => {
            const d = new Dictionary<internal.CustomerPhonebook>()
            d[1] = internal.CustomerPhonebook.create({id: 1, name: 'a', number: '1', contractId: 2})
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(d, makeSr(subadminUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('importCsv', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should reject duplicate customer/number pairs', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(1, '5'), makeEntity(1, '5')], makeSr(user)))
                .rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should accept the same number for different customers', async () => {
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            await expect(service.importCsv([makeEntity(1, '5'), makeEntity(2, '5')], makeSr(user))).resolves.toHaveLength(1)
        })
        it('should purge each customer once for purge_existing=true and drop the flag', async () => {
            const purge = jest.spyOn(phonebookMockRepo, 'purge')
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
        it('should create and read back the imported entries', async () => {
            const create = jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1, 2])
            const read = jest.spyOn(phonebookMockRepo, 'readWhereInIds')
            await service.importCsv([makeEntity(1, '5')], makeSr(user))
            expect(create).toHaveBeenCalledTimes(1)
            expect(read.mock.calls[0][0]).toStrictEqual([1, 2])
        })

        it('should reject subscriberadmin importing for another customer', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(2, '5')], makeSr(subadminUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('reseller scope', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should create for a customer of the own reseller', async () => {
            const count = jest.spyOn(phonebookMockRepo, 'readCustomerIdsOfReseller')
            const result = await service.create([makeEntity(1, '951')], makeSr(resellerUser))
            expect(result).toHaveLength(1)
            expect(count).toHaveBeenCalledWith([1], 2)
        })
        it('should reject create for a customer of another reseller', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.create([makeEntity(1, '952'), makeEntity(3, '953')], makeSr(resellerUser)))
                .rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should reject moving an entry to a customer of another reseller', async () => {
            const d = new Dictionary<internal.CustomerPhonebook>()
            d[1] = internal.CustomerPhonebook.create({id: 1, name: 'a', number: '1', contractId: 3})
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(d, makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should reject importing for a customer of another reseller', async () => {
            const purge = jest.spyOn(phonebookMockRepo, 'purge')
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(3, '954')], makeSr(resellerUser, {purge_existing: 'true'})))
                .rejects.toThrow(ApiErrorException)
            expect(purge).not.toHaveBeenCalled()
            expect(spy).not.toHaveBeenCalled()
        })
        it('should not check the customer reseller for an admin', async () => {
            const count = jest.spyOn(phonebookMockRepo, 'readCustomerIdsOfReseller')
            await service.create([makeEntity(1, '955')], makeSr(user))
            expect(count).not.toHaveBeenCalled()
        })
    })

    describe('exportCsv', () => {
        it('should return a csv attachment with the entries and without resource_url', async () => {
            const file = await service.exportCsv(makeSr(user))
            expect(file).toBeInstanceOf(StreamableFile)
            const headers = file.getHeaders()
            expect(headers.type).toBe('text/csv')
            expect(headers.disposition).toBe('attachment; filename="customer_phonebook.csv"')
            let csv = ''
            for await (const chunk of file.getStream()) {
                csv += chunk.toString()
            }
            const [header] = csv.split(/\r?\n/)
            expect(header).toContain('customer_id')
            expect(header).toContain('number')
            expect(header).not.toContain('resource')
            expect(csv).toContain('test4')
        })
    })
})
