import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'
import {UrlReferenceType} from 'enums/url-reference-type.enum'
import {UrlReference} from 'types/url-reference.type'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'


export class HeaderManipulationRuleResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        set_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        description: string

    @IsInt()
    @ApiProperty()
        priority: number

    @IsEnum(HeaderRuleDirection)
    @ApiProperty()
        direction: HeaderRuleDirection

    @IsBoolean()
    @ApiProperty()
        stopper: boolean

    @IsBoolean()
    @ApiProperty()
        enabled: boolean

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty()
        actions: UrlReference

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty()
        conditions: UrlReference

    constructor(prefix: string, entity: internal.HeaderRule) {
        this.id = entity.id
        this.name = entity.name
        this.set_id = entity.setId
        this.description = entity.description
        this.priority = entity.priority
        this.direction = entity.direction
        this.stopper = entity.stopper
        this.enabled = entity.enabled
        this.actions = {
            type: UrlReferenceType.Link,
            url: prefix + '/' + entity.id + '/actions',
        }
        this.conditions = {
            type: UrlReferenceType.Link,
            url: prefix + '/' + entity.id + '/conditions',
        }
    }
}