import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class NCOSSetResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the NCOS set'})
        id: number

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Reseller of the NCOS set'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the NCOS set'})
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Description of the NCOS set'})
        description: string

    @IsOptional()
    @IsBoolean()
    @ApiProperty({description: 'Customers can see and use the set in their preferences'})
        expose_to_customer: boolean

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the levels of the set'})
        levels: UrlReference

    constructor(entity: internal.NCOSSet, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.expose_to_customer = entity.exposeToCustomer
        this.levels = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/levels`,
        }
    }
}
