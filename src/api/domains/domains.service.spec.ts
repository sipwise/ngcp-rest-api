import {Test, TestingModule} from '@nestjs/testing'
import {DomainsService} from './domains.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AppModule} from '../../app.module'
import {DomainsMockRepository} from './repositories/domains.mock.repository'
import {DomainsModule} from './domains.module'
import {DomainsMariadbRepository} from './repositories/domains.mariadb.repository'
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

describe('DomainsService', () => {
    let service: DomainsService
    let domainsMockRepo: DomainsMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        domainsMockRepo = new DomainsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [DomainsModule, AppModule],
        })
            .overrideProvider(DomainsMariadbRepository).useValue(domainsMockRepo)
            .compile()

        service = module.get<DomainsService>(DomainsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(domainsMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of domains', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await domainsMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return domain by id', async () => {
            const got = await service.read(1, sr)
            expect(got).toStrictEqual(await domainsMockRepo.readById(1, sr))
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
