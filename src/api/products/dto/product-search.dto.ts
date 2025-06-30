import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductSearchDto {
    class: ProductClass = undefined
    handle: string = undefined
    name: string = undefined
    _alias = {
        id: 'product_id',
    }
}
