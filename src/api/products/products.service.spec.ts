import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Test, TestingModule} from '@nestjs/testing'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ProductsService} from './products.service'
import {ProductsModule} from './products.module'
import {ProductsMariadbRepository} from './repositories/products.mariadb.repository'
import {ProductsMockRepository} from './repositories/products.mock.repository'

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

describe('ProductsService', () => {
    let service: ProductsService
    let productsMockRepo: ProductsMockRepository

    let sr: ServiceRequest

    beforeEach(async () => {
        productsMockRepo = new ProductsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ProductsModule, ExpandModule, AppModule],
        })
            .overrideProvider(ProductsMariadbRepository).useValue(productsMockRepo)
            .compile()

        service = module.get<ProductsService>(ProductsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(productsMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a pbxgroup by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await productsMockRepo.read(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of pbxgroups', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await productsMockRepo.readAll(sr))
        })
    })
})