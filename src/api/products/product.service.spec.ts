import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Test, TestingModule} from '@nestjs/testing'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {ProductService} from './product.service'
import {ProductModule} from './product.module'
import {ProductMariadbRepository} from './repositories/product.mariadb.repository'
import {ProductMockRepository} from './repositories/product.mock.repository'

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

describe('ProductService', () => {
    let service: ProductService
    let productMockRepo: ProductMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        productMockRepo = new ProductMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [ProductModule, ExpandModule, AppModule],
        })
            .overrideProvider(ProductMariadbRepository).useValue(productMockRepo)
            .compile()

        service = module.get<ProductService>(ProductService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined, returnContent:undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(productMockRepo).toBeDefined()
    })

    describe('read', () => {
        it('should return a pbxgroup by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await productMockRepo.read(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of pbxgroups', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await productMockRepo.readAll(sr))
        })
    })
})