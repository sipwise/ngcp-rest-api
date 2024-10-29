import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'


import {SystemContactRequestDto} from './dto/system-contact-request.dto'
import {SystemContactModule} from './system-contact.module'
import {SystemContactService} from './system-contact.service'

import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {ContactMockRepository} from '~/api/contacts/repositories/contact.mock.repository'
import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
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

describe('SystemContactService', () => {

    let service: SystemContactService
    let contactMockRepo: ContactMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contactMockRepo = new ContactMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [SystemContactModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContactMariadbRepository).useValue(contactMockRepo)
            .compile()

        service = module.get<SystemContactService>(SystemContactService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contactMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a system contact contact by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(1, {type: ContactType.SystemContact}))
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of system contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contactMockRepo.readAll(sr, {type: ContactType.SystemContact}))
        })
    })

    describe('create', () => {
        it('should create a system contact', async () => {
            const result = await service.create([internal.Contact.create({})], sr)
            const contact = result[0]
            expect(contact).toStrictEqual(await contactMockRepo.readById(contact.id, {type: ContactType.SystemContact}))
        })
    })

    describe('update', () => {
        it('should update a system contact by id', async () => {
            const id = 1
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({firstname: 'updatedFirstName'})
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contactMockRepo.readById(result.id, {type: ContactType.SystemContact}))
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({})
            await expect(service.update(updates, sr)).rejects.toThrow()
        })
        it('should throw an error if reseller_id is updated', async () => {
            const id = 1
            const updates = new Dictionary<internal.Contact>()
            updates[id] = internal.Contact.create({reseller_id: 10})
            await expect(service.update(updates, sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('adjust', () => {
        it('should update a system contact by id', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/status', value: ContactStatus.Terminated},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contact, SystemContactRequestDto>(oldEntity, patch, SystemContactRequestDto)
            const update = new Dictionary<internal.Contact>(id.toString(), entity)

            const got = await service.update(update, sr)
            expect(got.length).toStrictEqual(1)
            expect(got[0]).toStrictEqual(id)

            const result = await service.read(id, sr)
            expect(result.status).toStrictEqual(ContractStatus.Terminated)
        })
        it.skip('should throw an error if id does not exist', async () => {
            const id = 100
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/status', value: ContactStatus.Terminated},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contact, SystemContactRequestDto>(oldEntity, patch, SystemContactRequestDto)
            const update = new Dictionary<internal.Contact>(id.toString(), entity)
            await expect(service.update(update, sr)).rejects.toThrow(NotFoundException)
        })

        // TODO: when debugging reseller_id is not set, but an exception is thrown as expected
        //       but DELETE fails because somehow the reseller_id is set in the repository!?
        it.skip('should throw an error if reseller_id was updated', async () => {
            const id = 1
            const resellerId = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/reseller_id', value: resellerId},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contact, SystemContactRequestDto>(oldEntity, patch, SystemContactRequestDto)
            const update = new Dictionary<internal.Contact>(id.toString(), entity)
            await expect(service.update(update, sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('delete', () => {
        it('should delete a system contact by id', async () => {
            const id = 1
            const result = await service.delete([id], sr)
            expect(result).toStrictEqual([id])
        })
        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
        it('should throw an error if trying to delete a customer contact', async () => {
            const id = 2
            await expect(service.delete([id], sr)).rejects.toThrow()
        })
    })
})
