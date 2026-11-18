import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class ProductResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the product'})
        id: number

    @IsEnum(ProductClass)
    @ApiProperty({description: 'Product class, the kind of contract it is used for'})
        class: ProductClass

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Unique handle of the product'})
        handle: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the product'})
        name: string

    constructor(data: internal.Product, options?: ResponseDtoOptions) {
        super(options)
        this.id = data.id
        this.class = data.class
        this.handle = data.handle
        this.name = data.name
    }
}
