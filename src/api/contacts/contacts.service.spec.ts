import {Test, TestingModule} from '@nestjs/testing'
import {ContactsService} from './contacts.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ContactsMockRepository} from './repositories/contacts.mock.repository'
import {ContactsMariadbRepository} from './repositories/contacts.mariadb.repository'
import {ContactsModule} from './contacts.module'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {internal} from '../../entities'
import {HttpException, UnprocessableEntityException} from '@nestjs/common'

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

describe('ContactsService', () => {
    let service: ContactsService
    let contactsMockRepo: ContactsMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contactsMockRepo = new ContactsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ContactsModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContactsMariadbRepository).useValue(contactsMockRepo)
            .compile()

        service = module.get<ContactsService>(ContactsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contactsMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a contact by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await contactsMockRepo.readContactById(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contactsMockRepo.readAllContacts(sr))
        })
    })

    describe('create', () => {
        it('should create a valid system contact', async () => {
            const result = await service.create(internal.Contact.create({}), sr)
            expect(result).toStrictEqual(await contactsMockRepo.readSystemContactById(result.id, sr))
        })
        it('should create a customer contact', async () => {
            const result = await service.create(internal.Contact.create({reseller_id: 1}), sr)
            expect(result).toStrictEqual(await contactsMockRepo.readCustomerContactById(result.id, sr))
        })
        it('should throw an error if reseller_id in customer contact does not exist', async () => {
            await expect(service.create(internal.Contact.create({reseller_id: 100}), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('update', () => {
        it('should update a system contact by id', async () => {
            const id = 1
            const result = await service.update(id, internal.Contact.create({firstname: 'updated'}), sr)
            expect(result).toStrictEqual(await contactsMockRepo.readSystemContactById(result.id, sr))
        })
        it('should update a customerContact by id', async () => {
            const result = await service.update(2, internal.Contact.create({reseller_id: 3}), sr)
            expect(result).toStrictEqual(await contactsMockRepo.readCustomerContactById(result.id, sr))
        })
        it('should update a customer contact reseller_id if reseller_id changed', async () => {
            const id = 2
            const update = internal.Contact.create({reseller_id: 2})
            const result = await service.update(id, update, sr)
            expect(result).toStrictEqual(await contactsMockRepo.readCustomerContactById(result.id, sr))
            expect(result.reseller_id).toStrictEqual(update.reseller_id)
        })
        it('should throw an error if changed reseller_id does not exist', async () => {
            await expect(service.update(2, internal.Contact.create({reseller_id: 100}), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('delete', () => {
        describe('system contact', () => {
            it('should delete a system contact by id', async () => {
                const id = 1
                const result = await service.delete(id, sr)
                expect(result).toStrictEqual(1)
            })
        })
        describe('customer contact', () => {
            it('should delete a contact by id', async () => {
                const id = 3
                const result = await service.delete(id, sr)
                expect(result).toStrictEqual(1)
            })
            it('should throw an error if contact has an active contract', async () => {
                // TODO: Do we want to throw HttpException in service?
                await expect(service.delete(2, sr)).rejects.toThrow(HttpException)
            })
            it('should throw an error if contact has an active subscriber', async () => {
                // TODO: implement when we have internal.VoipSubscriber
                // await expect(service.delete(4, sr)).rejects.toThrow(UnprocessableEntityException)
            })
            it('should set status to terminated if contact has terminated contract or subscriber', async () => {
                const id = 1
                const result = await service.delete(id, sr)
                // TODO: we currently cannot check the new status as the return value is number
                expect(result).toStrictEqual(1)
            })
        })
    })
})