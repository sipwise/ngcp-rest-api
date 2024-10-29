import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsOptional} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class HeaderManipulationSetResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsOptional()
    @ApiPropertyOptional()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsOptional()
    @ApiPropertyOptional()
        subscriber_id?: number

    @ApiProperty()
        description: string

    @IsNotEmpty()
    @ApiProperty()
        rules: UrlReference

    constructor(prefix: string, entity: internal.HeaderRuleSet) {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.subscriber_id = entity.subscriberId
        this.rules = {
            type: UrlReferenceType.Link,
            url: prefix + '/' + entity.id + '/rules',
        }
    }
}