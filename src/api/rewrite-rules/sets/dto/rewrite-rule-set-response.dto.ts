import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class RewriteRuleSetResponseDto implements ResponseDto {
    @ApiProperty()
    @IsInt()
    @IsPositive()
        id: number

    @ApiProperty()
    @IsInt()
    @IsPositive()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
        name: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
        description?: string

    @ApiProperty()
    @IsNotEmpty()
        rules: UrlReference

    constructor(prefix: string, entity: internal.RewriteRuleSet) {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.rules = {
            type: UrlReferenceType.Link,
            url: prefix + '/' + entity.id + '/rules',
        }
    }
}