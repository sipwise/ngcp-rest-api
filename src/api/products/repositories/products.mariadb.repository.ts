import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {db, internal} from '../../../entities'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {ProductSearchDto} from '../dto/product-search.dto'
import {Injectable, Logger} from '@nestjs/common'

@Injectable()
export class ProductsMariadbRepository {

    private readonly log: Logger = new Logger(ProductsMariadbRepository.name)
    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.Product[], number]> {
        this.log.debug({message: 'read all products', func: this.readAll.name, user: sr.user.username})
        const queryBuilder = db.billing.Product.createQueryBuilder('product')
        const productSearchDtoKeys = Object.keys(new ProductSearchDto())
        await configureQueryBuilder(queryBuilder, sr.query, new SearchLogic(sr, productSearchDtoKeys))
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(product => product.toInternal()), totalCount]
    }

    @HandleDbErrors
    async read(id: number, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({message: 'read product by id', func: this.read.name, user: sr.user.username, id: id})
        const result = await db.billing.Product.findOneOrFail(id)
        return result.toInternal()
    }
}