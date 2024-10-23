import {Test, TestingModule} from '@nestjs/testing'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {ContactMockRepository} from '~/api/contacts/repositories/contact.mock.repository'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {ExpandModule} from '~/helpers/expand.module'
import {AppModule} from '~/app.module'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {CustomerContactService} from '~/api/customercontacts/customer-contact.service'
import {internal} from '~/entities'
import {HttpException, UnprocessableEntityException} from '@nestjs/common'
import {CustomerContactModule} from '~/api/customercontacts/customer-contact.module'
import {Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {deepCopy} from '~/helpers/deep-copy.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CustomerContactRequestDto} from '~/api/customercontacts/dto/customer-contact-request.dto'

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
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contactMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a customer contact by id', async () => {
            const result = await service.read(2, sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(2, {type: ContactType.CustomerContact}))
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
            expect(got).toStrictEqual(await contactMockRepo.readAll(sr, {type: ContactType.CustomerContact}))
        })
    })

    describe('create', () => {
        it('should create a customer contact', async () => {
            const result = await service.create([internal.Contact.create({reseller_id: 1})], sr)
            const contact = result[0]
            expect(contact).toStrictEqual(await contactMockRepo.readById(contact.id, {type: ContactType.CustomerContact}))
        })
        it('should set reseller_id to user.reseller_id if user.reseller_id_required', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id_required = true
            const expectedResellerId = localRequest.user.reseller_id
            const result = await service.create([internal.Contact.create({reseller_id: 1})], localRequest)
            const contact = result[0]
            expect(contact).toStrictEqual(await contactMockRepo.readById(contact.id, {type: ContactType.CustomerContact}))
            expect(contact.reseller_id).toStrictEqual(expectedResellerId)
        })
        it('should throw an error if reseller_id is invalid', async () => {
            await expect(service.create([internal.Contact.create({reseller_id: 100})], sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('update', () => {
        it('should update a customer contact by id', async () => {
            const id = 2
            const resellerId = 1
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: resellerId})
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.CustomerContact}))
        })
        it('should update a customer contact reseller_id if reseller_id changed', async () => {
            const id = 2
            const resellerId = 2
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: resellerId})
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.CustomerContact}))
            expect(result.reseller_id).toStrictEqual(updates[id].reseller_id)
        })
        it('should set reseller_id to user.reseller_id if user.reseller_id_required', async () => {
            const id = 2
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id_required = true
            const expectedResellerId = localRequest.user.reseller_id
            const updates = new Dictionary<internal.Contact>()

            const resellerId = 3
            updates[id] = internal.Contact.create({reseller_id: resellerId})
            const ids = await service.update(updates, localRequest)
            const result = await service.read(ids[0], localRequest)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.CustomerContact}))
            expect(result.reseller_id).toStrictEqual(expectedResellerId)

        })
        it('should throw an error if update reseller_id is invalid', async () => {
            const id = 2
            const resellerId = 100
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: resellerId})
            await expect(service.update(updates, sr)).rejects.toThrow(UnprocessableEntityException)
        })
        // TODO: ? it('should throw an error if reseller changes reseller_id', async () => { })
    })

    describe('adjust', () => {
        it('should update a customer contact by id', async () => {
            const id = 2
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/status', value: ContactStatus.Terminated},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contact, CustomerContactRequestDto>(oldEntity, patch, CustomerContactRequestDto)
            const update = new Dictionary<internal.Contact>(id.toString(), entity)

            const got = await service.update(update, sr)
            expect(got.length).toStrictEqual(1)
            expect(got[0]).toStrictEqual(id)

            const result = await service.read(id, sr)
            expect(result.status).toStrictEqual(ContractStatus.Terminated)
        })
        it('should throw an error if update reseller_id is invalid', async () => {
            const id = 2
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/reseller_id', value: 100},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contact, CustomerContactRequestDto>(oldEntity, patch, CustomerContactRequestDto)
            const update = new Dictionary<internal.Contact>(id.toString(), entity)
            await expect(service.update(update, sr)).rejects.toThrow(UnprocessableEntityException)
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
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contact, CustomerContactRequestDto>(oldEntity, patch, CustomerContactRequestDto)
            const update = new Dictionary<internal.Contact>(id.toString(), entity)
            const got = await service.update(update, localRequest)
            expect(got.length).toStrictEqual(1)
            expect(got[0]).toStrictEqual(id)

            const result = await service.read(id, localRequest)
            expect(result.reseller_id).toStrictEqual(expectedResellerId)
        })
    })

    describe('delete', () => {
        it('should delete a contact by id', async () => {
            const id = 3
            const result = await service.delete([id], sr)
            expect(result).toStrictEqual([id])
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
            const id = 3
            const result = await service.delete([id], sr)
            // TODO: we currently cannot check the new status as the return value is number
            expect(result).toStrictEqual([id])
        })
    })
})
