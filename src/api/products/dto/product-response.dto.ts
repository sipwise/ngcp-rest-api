import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductResponseDto implements ResponseDto {
    @ApiProperty()
        id: number
    @ApiProperty()
        class: ProductClass
    @ApiProperty()
        handle: string
    @ApiProperty()
        name: string

    constructor(data: internal.Product) {
        this.id = data.id
        this.class = data.class
        this.handle = data.handle
        this.name = data.name
    }
}
