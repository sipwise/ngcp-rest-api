import {db} from '../../entities'
import {FindManyOptions} from 'typeorm'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {Injectable} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ProductResponseDto} from './dto/product-response.dto'

@Injectable()
export class ProductsService {

    toResponse(db: db.billing.Product) {
        return {
            id: db.id,
            class: db.class,
            handle: db.handle,
            name: db.name,
        }
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<ProductResponseDto[]> {
        const option: FindManyOptions = {take: rows, skip: rows * (page - 1)}
        const result = await db.billing.Product.find(option)
        return result.map((vm: db.billing.Product) => this.toResponse(vm))
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<ProductResponseDto> {
        const result = await db.billing.Product.findOneOrFail(id)
        return this.toResponse(result)
    }
}
