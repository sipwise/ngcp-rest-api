import {ForbiddenException, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'
import {ResellerMockRepository} from './repositories/reseller.mock.repository'
import {ResellerModule} from './reseller.module'
import {ResellerService} from './reseller.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
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

describe('ResellerService', () => {
    let service: ResellerService
    let resellerMockRepo: ResellerMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        resellerMockRepo = new ResellerMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ResellerModule, ExpandModule, AppModule],
        })
            .overrideProvider(ResellerMariadbRepository).useValue(resellerMockRepo)
            .compile()

        service = module.get<ResellerService>(ResellerService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(resellerMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of resellers', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await resellerMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return a reseller by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await resellerMockRepo.read(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('create', () => {
        it('should return a valid reseller', async () => {
            const result = await service.create([internal.Reseller.create({
                contract_id: 3,
                name: 'jest1',
                status: ResellerStatus.Active,
            })], sr)
            const reseller = result[0]
            expect(reseller).toStrictEqual(await resellerMockRepo.read(reseller.id, sr))
        })

        it('should throw an error if contract does not exist', async () => {
            await expect(service.create([internal.Reseller.create({
                contract_id: 100,
                name: 'jest2',
                status: ResellerStatus.Active,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if contract does not have systemcontact', async () => {
            await expect(service.create([internal.Reseller.create({
                contract_id: 4,
                name: 'jest3',
                status: ResellerStatus.Active,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if reseller with contract id exists', async () => {
            await expect(service.create([internal.Reseller.create({
                contract_id: 2,
                name: 'jest4',
                status: ResellerStatus.Active,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if non-terminated reseller with name exists', async () => {
            await expect(service.create([internal.Reseller.create({
                contract_id: 5,
                name: 'reseller1',
                status: ResellerStatus.Active,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('create (terminated name, side effects)', () => {
        it('renames a terminated reseller with the same name and creates the new one', async () => {
            jest.spyOn(resellerMockRepo, 'readByName').mockResolvedValue(
                internal.Reseller.create({id: 77, contract_id: 1, name: 'old', status: ResellerStatus.Terminated}))
            const renameSpy = jest.spyOn(resellerMockRepo, 'renameReseller')
            const templatesSpy = jest.spyOn(resellerMockRepo, 'createEmailTemplates')
            const result = await service.create([internal.Reseller.create({
                contract_id: 6,
                name: 'old',
                status: ResellerStatus.Active,
            })], sr)
            expect(renameSpy).toHaveBeenCalledWith(77, 'old')
            expect(templatesSpy).toHaveBeenCalledWith([result[0].id])
        })

        it('does not create anything when a later item is invalid', async () => {
            const createSpy = jest.spyOn(resellerMockRepo, 'create')
            await expect(service.create([
                internal.Reseller.create({contract_id: 5, name: 'jest-ok', status: ResellerStatus.Active}),
                internal.Reseller.create({contract_id: 100, name: 'jest-bad', status: ResellerStatus.Active}),
            ], sr)).rejects.toThrow(UnprocessableEntityException)
            expect(createSpy).not.toHaveBeenCalled()
        })
    })

    describe('update', () => {
        const upd = (id: number, r: Partial<internal.Reseller>): Dictionary<internal.Reseller> =>
            new Dictionary<internal.Reseller>(id.toString(), internal.Reseller.create({id, ...r} as internal.Reseller))
        const resellerUser: AuthResponseDto = {...user, role: 'reseller', is_master: false, reseller_id: 1, reseller_id_required: true}
        let srReseller: ServiceRequest
        let updateSpy: jest.SpyInstance

        beforeEach(() => {
            updateSpy = jest.spyOn(resellerMockRepo, 'update').mockResolvedValue([1])
            srReseller = {...sr, user: resellerUser}
        })

        it('throws NotFoundException when an id does not exist', async () => {
            await expect(service.update(upd(100, {contract_id: 1, name: 'x'}), sr)).rejects.toThrow(NotFoundException)
            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('throws NotFoundException when only some ids exist', async () => {
            const updates = upd(1, {contract_id: 1, name: 'reseller1'})
            updates['100'] = internal.Reseller.create({id: 100, contract_id: 1, name: 'x'} as internal.Reseller)
            await expect(service.update(updates, sr)).rejects.toThrow(NotFoundException)
            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('updates without validation when contract and name are unchanged', async () => {
            const contractSpy = jest.spyOn(resellerMockRepo, 'contractExists')
            const nameSpy = jest.spyOn(resellerMockRepo, 'readByName')
            const updates = upd(1, {contract_id: 1, name: 'reseller1', status: ResellerStatus.Active})
            await expect(service.update(updates, sr)).resolves.toEqual([1])
            expect(contractSpy).not.toHaveBeenCalled()
            expect(nameSpy).not.toHaveBeenCalled()
            expect(updateSpy).toHaveBeenCalledWith(updates, sr)
        })

        it('throws 422 when the new name exists', async () => {
            jest.spyOn(resellerMockRepo, 'readByName').mockResolvedValue(
                internal.Reseller.create({id: 2, contract_id: 2, name: 'taken'} as internal.Reseller))
            await expect(service.update(upd(1, {contract_id: 1, name: 'taken'}), sr)).rejects.toThrow(UnprocessableEntityException)
            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('allows a free new name', async () => {
            await expect(service.update(upd(1, {contract_id: 1, name: 'free-name'}), sr)).resolves.toEqual([1])
        })

        it('throws 422 when the new contract does not exist', async () => {
            await expect(service.update(upd(1, {contract_id: 100, name: 'reseller1'}), sr)).rejects.toThrow(UnprocessableEntityException)
        })

        it('throws 422 when the new contract already has a reseller', async () => {
            await expect(service.update(upd(1, {contract_id: 2, name: 'reseller1'}), sr)).rejects.toThrow(UnprocessableEntityException)
        })

        it('throws 422 when the new contract has no system contact', async () => {
            await expect(service.update(upd(1, {contract_id: 4, name: 'reseller1'}), sr)).rejects.toThrow(UnprocessableEntityException)
        })

        it('accepts a valid new contract', async () => {
            await expect(service.update(upd(1, {contract_id: 5, name: 'reseller1'}), sr)).resolves.toEqual([1])
        })

        it('forbids a reseller user to update another reseller', async () => {
            await expect(service.update(upd(2, {contract_id: 2, name: 'reseller1'}), srReseller)).rejects.toThrow(ForbiddenException)
            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('allows a reseller user to update its own reseller', async () => {
            await expect(service.update(upd(1, {contract_id: 1, name: 'reseller1'}), srReseller)).resolves.toEqual([1])
        })
    })
})
