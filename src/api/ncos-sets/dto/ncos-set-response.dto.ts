import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class NCOSSetResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        description: string

    @IsOptional()
    @IsBoolean()
    @ApiProperty()
        expose_to_customer: boolean

    @ValidateNested()
    @Type(() => UrlReference)
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