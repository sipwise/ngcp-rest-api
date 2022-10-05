import {Test, TestingModule} from '@nestjs/testing'
import {SystemcontactsService} from './systemcontacts.service'
import {ContactsMockRepository} from '../contacts/repositories/contacts.mock.repository'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ContactsMariadbRepository} from '../contacts/repositories/contacts.mariadb.repository'
import {SystemcontactsModule} from './systemcontacts.module'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {internal} from '../../entities'
import {BadRequestException, UnprocessableEntityException} from '@nestjs/common'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {ContactStatus} from '../../entities/internal/contact.internal.entity'
import {ContractStatus} from '../../entities/internal/contract.internal.entity'

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

describe('SystemcontactsService', () => {

    let service: SystemcontactsService
    let contactsMockRepo: ContactsMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contactsMockRepo = new ContactsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [SystemcontactsModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContactsMariadbRepository).useValue(contactsMockRepo)
            .compile()

        service = module.get<SystemcontactsService>(SystemcontactsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contactsMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a system contact contact by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await contactsMockRepo.readSystemContactById(1, sr))
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of system contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contactsMockRepo.readAllSystemContacts(sr))
        })
    })

    describe('create', () => {
        it('should create a system contact', async () => {
            const result = await service.create(internal.Contact.create({}), sr)
            expect(result).toStrictEqual(await contactsMockRepo.readSystemContactById(result.id, sr))
        })
        it('should throw an error when trying to create a customer contact', async () => {
            await expect(service.create(internal.Contact.create({reseller_id: 1}), sr)).rejects.toThrow(BadRequestException)
        })
    })

    describe('update', () => {
        it('should update a system contact by id', async () => {
            const id = 1
            const result = await service.update(id, internal.Contact.create({firstname: 'updatedFirstName'}), sr)
            expect(result).toStrictEqual(await contactsMockRepo.readSystemContactById(result.id, sr))
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
        it('should throw an error if reseller_id is updated', async () => {
            const id = 1
            await expect(service.update(id, internal.Contact.create({reseller_id: 1}), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('adjust', () => {
        it('should update a system contact by id', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/status', value: ContactStatus.Terminated},
            ]
            const result = await service.adjust(id, patch, sr)
            expect(result).toStrictEqual(await contactsMockRepo.readSystemContactById(result.id, sr))
            expect(result.status).toStrictEqual(ContractStatus.Terminated)
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
        it('should throw an error if reseller_id was updated', async () => {
            const id = 1
            await expect(service.update(id, internal.Contact.create({reseller_id: 1}), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('delete', () => {
        it('should delete a system contact by id', async () => {
            const id = 1
            const result = await service.delete(id, sr)
            expect(result).toStrictEqual(1)
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
        it('should throw an error if trying to delete a customer contact', async () => {
            const id = 2
            await expect(service.delete(id, sr)).rejects.toThrow()
        })
    })
})
