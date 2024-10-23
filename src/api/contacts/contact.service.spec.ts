import {Test, TestingModule} from '@nestjs/testing'
import {ContactService} from '~/api/contacts/contact.service'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {ExpandModule} from '~/helpers/expand.module'
import {AppModule} from '~/app.module'
import {ContactMockRepository} from '~/api/contacts/repositories/contact.mock.repository'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {ContactModule} from '~/api/contacts/contact.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {HttpException, UnprocessableEntityException} from '@nestjs/common'
import {ContactType} from '~/entities/internal/contact.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'

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

describe('ContactService', () => {
    let service: ContactService
    let contactMockRepo: ContactMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contactMockRepo = new ContactMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ContactModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContactMariadbRepository).useValue(contactMockRepo)
            .compile()

        service = module.get<ContactService>(ContactService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contactMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a contact by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(1))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contactMockRepo.readAll(sr))
        })
    })

    describe('create', () => {
        it('should create a valid system contact', async () => {
            const result = await service.create([internal.Contact.create({})], sr)
            const contact = result[0]
            expect(contact).toStrictEqual(await contactMockRepo.readById(contact.id, {type: ContactType.SystemContact}))
        })
        it('should create a customer contact', async () => {
            const result = await service.create([internal.Contact.create({reseller_id: 1})], sr)
            const contact = result[0]
            expect(contact).toStrictEqual(await contactMockRepo.readById(contact.id, {type: ContactType.CustomerContact}))
        })
        it('should throw an error if reseller_id in customer contact does not exist', async () => {
            await expect(service.create([internal.Contact.create({reseller_id: 100})], sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('update', () => {
        it('should update a system contact by id', async () => {
            const id = 1
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({firstname: 'updated'})
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.SystemContact}))
        })
        it('should update a customerContact by id', async () => {
            const id = 2
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: 3})
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.CustomerContact}))
        })
        it('should update a customer contact reseller_id if reseller_id changed', async () => {
            const id = 2
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: 2})
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.CustomerContact}))
            expect(result.reseller_id).toStrictEqual(updates[id].reseller_id)
        })
        it('should throw an error if changed reseller_id does not exist', async () => {
            const id = 2
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: 100})
            await expect(service.update(updates, sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('delete', () => {
        describe('system contact', () => {
            it('should delete a system contact by id', async () => {
                const id = 1
                const result = await service.delete([id], sr)
                expect(result).toStrictEqual([1])
            })
        })
        describe('customer contact', () => {
            it('should delete a contact by id', async () => {
                const id = 3
                const result = await service.delete([id], sr)
                expect(result).toStrictEqual([3])
            })
            it('should throw an error if contact has an active contract', async () => {
                // TODO: Do we want to throw HttpException in service?
                await expect(service.delete([2], sr)).rejects.toThrow(HttpException)
            })
            it('should throw an error if contact has an active subscriber', async () => {
                // TODO: implement when we have internal.VoipSubscriber
                // await expect(service.delete(4, sr)).rejects.toThrow(UnprocessableEntityException)
            })
            it('should set status to terminated if contact has terminated contract or subscriber', async () => {
                const id = 1
                const result = await service.delete([id], sr)
                // TODO: we currently cannot check the new status as the return value is number
                expect(result).toStrictEqual([1])
            })
        })
    })
})
