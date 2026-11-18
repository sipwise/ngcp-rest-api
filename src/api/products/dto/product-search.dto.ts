import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductSearchDto {
    @ApiPropertyOptional({description: 'Product class, the kind of contract it is used for'})
        class: ProductClass
    @ApiPropertyOptional({description: 'Unique handle of the product'})
        handle: string
    @ApiPropertyOptional({description: 'Name of the product'})
        name: string
    @ApiPropertyOptional({description: 'Id of the product'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'product_id',
        }
}
