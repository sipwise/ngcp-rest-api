import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductSearchDto {
    @ApiPropertyOptional()
        class: ProductClass = undefined
    @ApiPropertyOptional()
        handle: string = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'product_id',
    }
}
