import {internal} from '~/entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsOptional} from 'class-validator'
import {ResponseDto} from '~/dto/response.dto'
import {UrlReference} from '~/types/url-reference.type'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'

export class NCOSSetResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsOptional()
    @ApiPropertyOptional()
        reseller_id: number

    @IsNotEmpty()
    @ApiProperty()
        name: string

    @ApiProperty()
        description: string

    @IsOptional()
    @ApiPropertyOptional()
        expose_to_customer: boolean

    @IsNotEmpty()
    @ApiProperty()
        levels: UrlReference

    constructor(prefix: string, entity: internal.NCOSSet) {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.expose_to_customer = entity.exposeToCustomer
        this.levels = {
            type: UrlReferenceType.Link,
            url: prefix + '/' + entity.id + '/levels',
        }
    }
}