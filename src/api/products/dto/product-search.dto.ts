import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductSearchDto {
    @ApiPropertyOptional()
        class: ProductClass
    @ApiPropertyOptional()
        handle: string
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'product_id',
        }
}
