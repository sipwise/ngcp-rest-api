import {UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {CustomerPhonebookModule} from '~/api/customers/phonebook/customer-phonebook.module'
import {CustomerPhonebookService} from '~/api/customers/phonebook/customer-phonebook.service'
import {CustomerPhonebookOptions} from '~/api/customers/phonebook/interfaces/customer-phonebook-options.interface'
import {CustomerPhonebookMariadbRepository} from '~/api/customers/phonebook/repositories/customer-phonebook.mariadb.repository'
import {CustomerPhonebookMockRepository} from '~/api/customers/phonebook/repositories/customer-phonebook.mock.repository'
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
})
