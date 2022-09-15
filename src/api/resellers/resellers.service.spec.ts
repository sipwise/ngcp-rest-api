import {Test, TestingModule} from '@nestjs/testing'
import {ResellersService} from './resellers.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ResellersMockRepository} from './repositories/resellers.mock.repository'
import {ResellersMariadbRepository} from './repositories/resellers.mariadb.repository'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ResellersModule} from './resellers.module'
import {internal} from '../../entities'
import {ResellerStatus} from '../../entities/internal/reseller.internal.entity'
import {UnprocessableEntityException} from '@nestjs/common'

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

describe('ResellersService', () => {
    let service: ResellersService
    let resellersMockRepo: ResellersMockRepository

    let sr: ServiceRequest

    beforeEach(async () => {
        resellersMockRepo = new ResellersMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ResellersModule, ExpandModule, AppModule],
        })
            .overrideProvider(ResellersMariadbRepository).useValue(resellersMockRepo)
            .compile()

        service = module.get<ResellersService>(ResellersService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(resellersMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of resellers', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await resellersMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return a reseller by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await resellersMockRepo.read(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('create', () => {
        it('should return a valid reseller', async () => {
            const result = await service.create(internal.Reseller.create({
                contract_id: 3,
                name: 'jest1',
                status: ResellerStatus.Active,
            }), sr)
            expect(result).toStrictEqual(await resellersMockRepo.read(result.id, sr))
        })

        it('should throw an error if contract does not exist', async () => {
            await expect(service.create(internal.Reseller.create({
                contract_id: 100,
                name: 'jest2',
                status: ResellerStatus.Active,
            }), sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if contract does not have systemcontact', async () => {
            await expect(service.create(internal.Reseller.create({
                contract_id: 4,
                name: 'jest3',
                status: ResellerStatus.Active,
            }), sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if reseller with contract id exists', async () => {
            await expect(service.create(internal.Reseller.create({
                contract_id: 2,
                name: 'jest4',
                status: ResellerStatus.Active,
            }), sr)).rejects.toThrow(UnprocessableEntityException)
        })
        it('should throw an error if non-terminated reseller with name exists', async () => {
            await expect(service.create(internal.Reseller.create({
                contract_id: 5,
                name: 'reseller1',
                status: ResellerStatus.Active,
            }), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })
})
