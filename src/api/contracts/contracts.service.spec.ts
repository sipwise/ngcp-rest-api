import {Test, TestingModule} from '@nestjs/testing'
import {ContractsService} from './contracts.service'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ContractsMockRepository} from './repositories/contracts.mock.repository'
import {ContractsModule} from './contracts.module'
import {ContractsMariadbRepository} from './repositories/contracts.mariadb.repository'
import {internal} from '../../entities'
import {ContractStatus, ContractType} from '../../entities/internal/contract.internal.entity'
import {UnprocessableEntityException} from '@nestjs/common'
import {Operation as PatchOperation} from '../../helpers/patch.helper'

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
    let service: ContractsService
    let contractsMockRepo: ContractsMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        contractsMockRepo = new ContractsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ContractsModule, ExpandModule, AppModule],
        })
            .overrideProvider(ContractsMariadbRepository).useValue(contractsMockRepo)
            .compile()

        service = module.get<ContractsService>(ContractsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(contractsMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a contract by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await contractsMockRepo.read(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of contracts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await contractsMockRepo.readAll(sr))
        })
    })

    describe('create', () => {
        it('should return a valid contract', async () => {
            const result = await service.create(internal.Contract.create({
                contact_id: 3,
                status: ContractStatus.Active,
                type: ContractType.Reseller,
            }), sr)
            expect(result).toStrictEqual(await contractsMockRepo.read(result.id, sr))
        })
        it('should throw an error if contract has no valid active contact_id', async () => {
            await expect(service.create(internal.Contract.create({
                status: ContractStatus.Active,
                contact_id: 100,
                type: ContractType.Reseller,
            }), sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if contract type is invalid', async () => {
            // TODO: because of input validation in controller, this should not be possible
        })
    })

    describe('update', () => {
        it('should update a contract by id', async () => {
            const result = await service.update(1, internal.Contract.create({
                contact_id: 3,
                status: ContractStatus.Active,
                type: ContractType.Reseller,
            }), sr)
            expect(result).toStrictEqual(await contractsMockRepo.read(result.id, sr))
        })
        it('should throw an error if updated contact_id is invalid', async () => {
            await expect(service.update(1, internal.Contract.create({
                contact_id: 100,
                status: ContractStatus.Active,
                type: ContractType.Reseller,
            }), sr)).rejects.toThrow(UnprocessableEntityException)
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
            const result = await service.adjust(id, patch, sr)
            expect(result.status).toStrictEqual(ContractStatus.Terminated)
        })
        it('should throw an error if updated contact_id is invalid', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/contact_id', value: 100},
            ]
            await expect(service.adjust(id, patch, sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if updated product type is invalid', async () => {
            const id = 1
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/type', value: 'invalid'},
            ]
            await expect(service.adjust(id, patch, sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })
})
