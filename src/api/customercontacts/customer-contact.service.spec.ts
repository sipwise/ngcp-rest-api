import {Test, TestingModule} from '@nestjs/testing'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ContactMockRepository} from '../contacts/repositories/contact.mock.repository'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'
import {CustomerContactService} from './customer-contact.service'
import {internal} from '../../entities'
import {HttpException, UnprocessableEntityException} from '@nestjs/common'
import {deepCopy} from '../../repositories/acl-role.mock.repository'
import {CustomerContactModule} from './customer-contact.module'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {ContractStatus} from '../../entities/internal/contract.internal.entity'
import {ContactStatus} from '../../entities/internal/contact.internal.entity'

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

describe('CustomerContactService', () => {
    let service: CustomerContactService
    let contactMockRepo: ContactMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contactMockRepo = new ContactMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [CustomerContactModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContactMariadbRepository).useValue(contactMockRepo)
            .compile()

        service = module.get<CustomerContactService>(CustomerContactService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contactMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a customer contact by id', async () => {
            const result = await service.read(2, sr)
            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(2, sr))
        })
        it('should throw an error if id belongs to system contact', async () => {
            const id = 1
            await expect(service.read(id, sr)).rejects.toThrow()
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of customer contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contactMockRepo.readAllCustomerContacts(sr))
        })
    })

    describe('create', () => {
        it('should create a customer contact', async () => {
            const result = await service.create(internal.Contact.create({reseller_id: 1}), sr)
            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(result.id, sr))
        })
        it('should set reseller_id to user.reseller_id if user.reseller_id_required', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id_required = true
            const expectedResellerId = localRequest.user.reseller_id
            const result = await service.create(internal.Contact.create({reseller_id: 1}), localRequest)
            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(result.id, localRequest))
            expect(result.reseller_id).toStrictEqual(expectedResellerId)
        })
        it('should throw an error if reseller_id is invalid', async () => {
            await expect(service.create(internal.Contact.create({reseller_id: 100}), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('update', () => {
        it('should update a customer contact by id', async () => {
            const result = await service.update(2, internal.Contact.create({reseller_id: 1}), sr)
            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(result.id, sr))
        })
        it('should update a customer contact reseller_id if reseller_id changed', async () => {
            const id = 2
            const update = internal.Contact.create({reseller_id: 2})
            const result = await service.update(id, update, sr)
            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(result.id, sr))
            expect(result.reseller_id).toStrictEqual(update.reseller_id)
        })
        it('should set reseller_id to user.reseller_id if user.reseller_id_required', async () => {
            const id = 2
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id_required = true
            const expectedResellerId = localRequest.user.reseller_id
            const update = internal.Contact.create({reseller_id: 3})
            const result = await service.update(id, update, localRequest)

            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(result.id, sr))
            expect(result.reseller_id).toStrictEqual(expectedResellerId)

        })
        it('should throw an error if update reseller_id is invalid', async () => {
            await expect(service.update(2, internal.Contact.create({reseller_id: 100}), sr)).rejects.toThrow(UnprocessableEntityException)
        })
        // TODO: ? it('should throw an error if reseller changes reseller_id', async () => { })
    })

    describe('adjust', () => {
        it('should update a customer contact by id', async () => {
            const id = 2
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/status', value: ContactStatus.Terminated},
            ]
            const result = await service.adjust(id, patch, sr)
            expect(result.status).toStrictEqual(ContractStatus.Terminated)
        })
        it('should throw an error if update reseller_id is invalid', async () => {
            const id = 2
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/reseller_id', value: 100},
            ]
            await expect(service.adjust(id, patch, sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should set reseller_id to user.reseller_id if user.reseller_id_required', async () => {
            const id = 2
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id_required = true
            const expectedResellerId = localRequest.user.reseller_id

            const patch: PatchOperation[] = [
                {op: 'replace', path: '/reseller_id', value: 3},
            ]

            const result = await service.adjust(id, patch, localRequest)
            expect(result).toStrictEqual(await contactMockRepo.readCustomerContactById(result.id, localRequest))
            expect(result.reseller_id).toStrictEqual(expectedResellerId)
        })
        // TODO: ? it('should throw an error if reseller changes reseller_id', async () => { })
    })

    describe('delete', () => {
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
            const id = 3
            const result = await service.delete(id, sr)
            // TODO: we currently cannot check the new status as the return value is number
            expect(result).toStrictEqual(1)
        })
    })
})
