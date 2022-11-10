import {Test, TestingModule} from '@nestjs/testing'
import {DomainService} from './domain.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AppModule} from '../../app.module'
import {DomainMockRepository} from './repositories/domain.mock.repository'
import {DomainModule} from './domain.module'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {deepCopy} from '../../repositories/acl-role.mock.repository'

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

describe('DomainService', () => {
    let service: DomainService
    let domainMockRepo: DomainMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        domainMockRepo = new DomainMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [DomainModule, AppModule],
        })
            .overrideProvider(DomainMariadbRepository).useValue(domainMockRepo)
            .compile()

        service = module.get<DomainService>(DomainService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(domainMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of domains', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await domainMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return domain by id', async () => {
            const got = await service.read(1, sr)
            expect(got).toStrictEqual(await domainMockRepo.readById(1, sr))
        })
    })

    describe('delete', () => {
        it('should delete domain by id', async () => {
            const got = await service.delete(1, sr)
            expect(got).toStrictEqual(1)
        })

        it('should throw ForbiddenException when accessing non-existing id', async () => {
            await expect(service.delete(5, sr)).rejects.toThrow()
        })

        it('should not allow deleting domain with different reseller_id as reseller', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            localRequest.user.reseller_id = 5
            await expect(service.delete(1, localRequest)).rejects.toThrow()
        })
    })

    describe('create', () => {
        // TODO: relies on ResellerRepo, implement once available
    })

})
