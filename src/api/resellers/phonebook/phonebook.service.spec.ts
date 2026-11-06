import {NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {ResellerPhonebookOptions} from './interfaces/phonebook-options.interface'
import {ResellerPhonebookModule} from './phonebook.module'
import {ResellerPhonebookService} from './phonebook.service'
import {ResellerPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'
import {ResellerPhonebookMockRepository} from './repositories/phonebook.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
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

const resellerUser: AuthResponseDto = {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}

const makeSr = (u: AuthResponseDto, query?: object, params?: object): ServiceRequest =>
    ({returnContent: true, headers: [undefined], params, query, user: u, req: undefined} as unknown as ServiceRequest)

const makeEntity = (resellerId: number | undefined, number: string): internal.ResellerPhonebook =>
    internal.ResellerPhonebook.create({name: `n${number}`, number, resellerId})

describe('phonebookService', () => {
    let service: ResellerPhonebookService
    let phonebookMockRepo: ResellerPhonebookMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        phonebookMockRepo = new ResellerPhonebookMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ResellerPhonebookModule, ExpandModule, AppModule],
        })
            .overrideProvider(ResellerPhonebookMariadbRepository).useValue(phonebookMockRepo)
            .compile()

        service = module.get<ResellerPhonebookService>(ResellerPhonebookService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(phonebookMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a phonebook by id', async () => {
            const options: ResellerPhonebookOptions = {filterBy: {}}
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
            const options: ResellerPhonebookOptions = {filterBy: {}}
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await phonebookMockRepo.readAll(options,sr))
        })
    })

    describe('create', () => {
        it('should create a valid phonebook', async () => {
            const options: ResellerPhonebookOptions = {filterBy: {}}
            const result = await service.create([internal.ResellerPhonebook.create({
                name: 'test_99',
                number: '991',
                resellerId: 1,
            })], sr)
            const phonebook = result[0]
            expect(phonebook).toStrictEqual(await phonebookMockRepo.readById(phonebook.id, options))
        })
        it('should throw an error if reseller_id does not exist', async () => {
            await expect(service.create([internal.ResellerPhonebook.create({
                name: 'test_99',
                number: '991',
                resellerId: 100,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should set reseller_id of the user for reseller roles', async () => {
            const resellerSr = {...sr, user: {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}}
            const result = await service.create([internal.ResellerPhonebook.create({
                name: 'test_98',
                number: '981',
            })], resellerSr)
            expect(result[0].resellerId).toEqual(1)
        })
    })

    describe('update', () => {
        it('should update a phonebook by id', async () => {
            const options: ResellerPhonebookOptions = {filterBy: {}}
            const id = 1
            const updates = new Dictionary<internal.ResellerPhonebook>()
            updates[id] = internal.ResellerPhonebook.create({
                id: 1,
                number: '111',
                name: 'foo',
                resellerId: 1,
            })
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await phonebookMockRepo.readById(result.id, options))
        })
        it('should throw an error if changed reseller_id does not exist', async () => {
            const id = 2
            const updates = new Dictionary<internal.ResellerPhonebook>()
            updates[id] = internal.ResellerPhonebook.create({
                id: 2,
                resellerId: 100,
                name: 'foo',
                number: '111',
            })
            await expect(service.update(updates, sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should set reseller_id of the user for reseller roles', async () => {
            const resellerSr = {...sr, user: {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}}
            const id = 3
            const updates = new Dictionary<internal.ResellerPhonebook>()
            updates[id] = internal.ResellerPhonebook.create({
                id: 3,
                resellerId: null,
                name: 'foo',
                number: '333',
            })
            const ids = await service.update(updates, resellerSr)
            const got = await service.read(ids[0], resellerSr)
            expect(got.resellerId).toEqual(1)
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
            expect(service.getResellerPhonebookOptionsFromServiceRequest(makeSr(user))).toStrictEqual(
                {filterBy: {resellerId: undefined, customerId: undefined}})
        })
        it('should filter by reseller id param for admin', () => {
            expect(service.getResellerPhonebookOptionsFromServiceRequest(makeSr(user, undefined, {resellerId: '7'})).filterBy.resellerId).toBe(7)
        })
        it('should filter by own reseller id for reseller user', () => {
            expect(service.getResellerPhonebookOptionsFromServiceRequest(makeSr(resellerUser)).filterBy.resellerId).toBe(1)
        })
        it('should accept the own reseller id param for reseller user', () => {
            expect(service.getResellerPhonebookOptionsFromServiceRequest(makeSr(resellerUser, undefined, {resellerId: '1'})).filterBy.resellerId).toBe(1)
        })
        it('should throw NotFound if reseller user asks for another reseller', () => {
            expect(() => service.getResellerPhonebookOptionsFromServiceRequest(makeSr(resellerUser, undefined, {resellerId: '9'})))
                .toThrow(NotFoundException)
        })
    })

    describe('reads with filters', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('readAll: should pass the reseller filter to the repository', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readAll')
            await service.readAll(makeSr(resellerUser))
            expect(spy.mock.calls[0][0].filterBy.resellerId).toBe(1)
        })
        it('read: should pass the reseller filter to the repository', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readById')
            await service.read(2, makeSr(resellerUser))
            expect(spy.mock.calls[0][0]).toBe(2)
            expect(spy.mock.calls[0][1].filterBy.resellerId).toBe(1)
        })
        it('read: should throw NotFound for a foreign reseller param', async () => {
            await expect(service.read(1, makeSr(resellerUser, undefined, {resellerId: '9'}))).rejects.toThrow(NotFoundException)
        })
        it('create: should override a given reseller id for reseller user and read back unfiltered', async () => {
            const entity = makeEntity(55, '701')
            const read = jest.spyOn(phonebookMockRepo, 'readWhereInIds')
            await service.create([entity], makeSr(resellerUser))
            expect(entity.resellerId).toBe(1)
            expect(read.mock.calls[0][1].filterBy.resellerId).toBeUndefined()
        })
        it('create: should keep the given reseller id for admin', async () => {
            const entity = makeEntity(1, '702')
            await service.create([entity], makeSr(user))
            expect(entity.resellerId).toBe(1)
        })
    })

    describe('update and delete counts', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        const updates = (): Dictionary<internal.ResellerPhonebook> => {
            const d = new Dictionary<internal.ResellerPhonebook>()
            d[1] = internal.ResellerPhonebook.create({id: 1, name: 'a', number: '1', resellerId: 1})
            d[2] = internal.ResellerPhonebook.create({id: 2, name: 'b', number: '2', resellerId: 1})
            return d
        }

        it('update: should throw NotFound if no id is visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readCountOfIds').mockResolvedValue(0)
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(updates(), makeSr(user))).rejects.toThrow(NotFoundException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('update: should throw 422 if only some ids are visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readCountOfIds').mockResolvedValue(1)
            const spy = jest.spyOn(phonebookMockRepo, 'update')
            await expect(service.update(updates(), makeSr(user))).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('update: should pass the reseller filter to the count', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'readCountOfIds')
            await service.update(updates(), makeSr(resellerUser))
            expect(spy.mock.calls[0][0]).toStrictEqual([1, 2])
            expect(spy.mock.calls[0][1].filterBy.resellerId).toBe(1)
        })
        it('delete: should throw NotFound if no id is visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readCountOfIds').mockResolvedValue(0)
            await expect(service.delete([1, 2], makeSr(user))).rejects.toThrow(NotFoundException)
        })
        it('delete: should throw 422 if only some ids are visible', async () => {
            jest.spyOn(phonebookMockRepo, 'readCountOfIds').mockResolvedValue(1)
            const spy = jest.spyOn(phonebookMockRepo, 'delete')
            await expect(service.delete([1, 2], makeSr(user))).rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('delete: should delete several ids', async () => {
            await expect(service.delete([1, 2], makeSr(user))).resolves.toStrictEqual([1, 2])
        })
    })

    describe('importCsv', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should reject duplicate reseller/number pairs', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(1, '5'), makeEntity(1, '5')], makeSr(user)))
                .rejects.toThrow(UnprocessableEntityException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should detect duplicates created by assigning the reseller id of a reseller user', async () => {
            await expect(service.importCsv([makeEntity(1, '5'), makeEntity(2, '5')], makeSr(resellerUser)))
                .rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw NotFound for a foreign reseller param', async () => {
            const spy = jest.spyOn(phonebookMockRepo, 'create')
            await expect(service.importCsv([makeEntity(1, '5')], makeSr(resellerUser, undefined, {resellerId: '9'})))
                .rejects.toThrow(NotFoundException)
            expect(spy).not.toHaveBeenCalled()
        })
        it('should purge each reseller once for purge_existing=true and drop the flag', async () => {
            const purge = jest.spyOn(phonebookMockRepo, 'purge')
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            const req = makeSr(user, {purge_existing: 'true'})
            await service.importCsv([makeEntity(1, '5'), makeEntity(1, '6'), makeEntity(2, '7')], req)
            expect(purge.mock.calls.map(c => c[0]).sort()).toStrictEqual([1, 2])
            expect(req.query['purge_existing']).toBeUndefined()
        })
        it('should purge only the own reseller for a reseller user', async () => {
            const purge = jest.spyOn(phonebookMockRepo, 'purge')
            jest.spyOn(phonebookMockRepo, 'create').mockResolvedValue([1])
            await service.importCsv([makeEntity(7, '5'), makeEntity(8, '6')], makeSr(resellerUser, {purge_existing: 'true'}))
            expect(purge).toHaveBeenCalledTimes(1)
            expect(purge.mock.calls[0][0]).toBe(1)
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
    })

    describe('exportCsv', () => {
        it('should return a csv attachment with the entries and without resource_url', async () => {
            const file = await service.exportCsv(makeSr(user))
            expect(file).toBeInstanceOf(StreamableFile)
            const headers = file.getHeaders()
            expect(headers.type).toBe('text/csv')
            expect(headers.disposition).toBe('attachment; filename="reseller_phonebook.csv"')
            let csv = ''
            for await (const chunk of file.getStream()) {
                csv += chunk.toString()
            }
            const [header] = csv.split(/\r?\n/)
            expect(header).toContain('reseller_id')
            expect(header).toContain('number')
            expect(header).not.toContain('resource')
            expect(csv).toContain('test4')
        })
    })
})
