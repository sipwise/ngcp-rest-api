import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class HeaderManipulationSetResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        subscriber_id?: number

    @CanBeNull()
    @IsString()
    @ApiProperty()
        description: string

    @ValidateNested()
    @Type(() => UrlReference)
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