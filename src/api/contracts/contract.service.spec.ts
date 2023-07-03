import {Test, TestingModule} from '@nestjs/testing'
import {ContractService} from './contract.service'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ContractMockRepository} from './repositories/contract.mock.repository'
import {ContractModule} from './contract.module'
import {ContractMariadbRepository} from './repositories/contract.mariadb.repository'
import {internal} from '../../entities'
import {ContractStatus, ContractType} from '../../entities/internal/contract.internal.entity'
import {UnprocessableEntityException} from '@nestjs/common'
import {Operation as PatchOperation, patchToEntity} from '../../helpers/patch.helper'
import {Dictionary} from '../../helpers/dictionary.helper'
import {ContractRequestDto} from './dto/contract-request.dto'

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

describe('ContractsService', () => {
    let service: ContractService
    let contractMockRepo: ContractMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contractMockRepo = new ContractMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ContractModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContractMariadbRepository).useValue(contractMockRepo)
            .compile()

        service = module.get<ContractService>(ContractService)
        sr = {
            returnContent: true,
            headers: [undefined],
            params: undefined,
            query: undefined,
            user: user,
            req: undefined,
        }
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contractMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a contract by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await contractMockRepo.read(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of contracts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contractMockRepo.readAll(sr))
        })
    })

    describe('create', () => {
        it('should return a valid contract', async () => {
            const result = await service.create([internal.Contract.create({
                contact_id: 3,
                status: ContractStatus.Active,
                type: ContractType.Reseller,
            })], sr)
            const contract = result[0]
            expect(contract).toStrictEqual(await contractMockRepo.read(contract.id, sr))
        })
        it('should throw an error if contract has no valid active contact_id', async () => {
            await expect(service.create([internal.Contract.create({
                status: ContractStatus.Active,
                contact_id: 100,
                type: ContractType.Reseller,
            })], sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('update', () => {
        it('should update a contract by id', async () => {
            const id = 1
            const updates = new Dictionary<internal.Contract>()
            updates[id] = internal.Contract.create({
                contact_id: 3,
                status: ContractStatus.Active,
                type: ContractType.Reseller,
            })
            const ids = await service.update(updates, sr)
            const result = await service.read(ids[0], sr)
            expect(result).toStrictEqual(await contractMockRepo.read(result.id, sr))
        })
        it('should throw an error if updated contact_id is invalid', async () => {
            const id = 1
            const contactId = 100
            const updates = new Dictionary<internal.Contract>()
            updates[id] = internal.Contract.create({
                contact_id: contactId,
                status: ContractStatus.Active,
                type: ContractType.Reseller,
            })
            await expect(service.update(updates, sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if updated product type is invalid', async () => {
            // TODO: because of input validation in controller, this should not be possible
        })
    })

    describe('adjust', () => {
        it('should update a contract by id', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/status', value: ContractStatus.Terminated},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contract, ContractRequestDto>(oldEntity, patch, ContractRequestDto)
            const update = new Dictionary<internal.Contract>(id.toString(), entity)

            const got = await service.update(update, sr)
            expect(got[0] == id)
            const result = await service.read(got[0], sr)
            expect(result.status).toStrictEqual(ContractStatus.Terminated)
        })
        it('should throw an error if updated contact_id is invalid', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/contact_id', value: 100},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contract, ContractRequestDto>(oldEntity, patch, ContractRequestDto)
            const update = new Dictionary<internal.Contract>(id.toString(), entity)
            await expect(service.update(update, sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if updated product type is invalid', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/type', value: 'invalid'},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Contract, ContractRequestDto>(oldEntity, patch, ContractRequestDto)
            const update = new Dictionary<internal.Contract>(id.toString(), entity)
            await expect(service.update(update, sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })
})
