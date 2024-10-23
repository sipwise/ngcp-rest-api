import {ProductResponseDto} from '~/api/products/dto/product-response.dto'
import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductSearchDto implements ProductResponseDto {
    id: number = undefined
    class: ProductClass = undefined
    handle: string = undefined
    name: string = undefined
}
