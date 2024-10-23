import {Test, TestingModule} from '@nestjs/testing'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {ExpandModule} from '~/helpers/expand.module'
import {AppModule} from '~/app.module'
import {ResellerMockRepository} from '~/api/resellers/repositories/reseller.mock.repository'
import {ResellerMariadbRepository} from '~/api/resellers/repositories/reseller.mariadb.repository'
import {ResellerService} from '~/api/resellers/reseller.service'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {ResellerModule} from '~/api/resellers/reseller.module'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
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
})
