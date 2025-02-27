import {UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {ResellerPhonebookOptions} from './interfaces/reseller-phonebook-options.interface'
import {ResellerPhonebookMariadbRepository} from './repositories/reseller-phonebook.mariadb.repository'
import {ResellerPhonebookMockRepository} from './repositories/reseller-phonebook.mock.repository'
import {ResellerPhonebookModule} from './reseller-phonebook.module'
import {ResellerPhonebookService} from './reseller-phonebook.service'

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
