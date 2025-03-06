import {UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {SubscriberPhonebookOptions} from './interfaces/subscriber-phonebook-options.interface'
import {SubscriberPhonebookMariadbRepository} from './repositories/subscriber-phonebook.mariadb.repository'
import {SubscriberPhonebookMockRepository} from './repositories/subscriber-phonebook.mock.repository'
import {SubscriberPhonebookModule} from './subscriber-phonebook.module'
import {SubscriberPhonebookService} from './subscriber-phonebook.service'

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
            })], sr)).rejects.toThrow(UnprocessableEntityException)
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
