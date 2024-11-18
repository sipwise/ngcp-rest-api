import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'

export class ProductResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsEnum(ProductClass)
    @ApiProperty()
        class: ProductClass

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        handle: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    constructor(data: internal.Product) {
        this.id = data.id
        this.class = data.class
        this.handle = data.handle
        this.name = data.name
    }
}
