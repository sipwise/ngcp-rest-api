import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {UrlReferenceType} from 'enums/url-reference-type.enum'
import {UrlReference} from 'types/url-reference.type'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'


export class HeaderManipulationRuleResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsNotEmpty()
    @ApiProperty()
        set_id: number

    @IsNotEmpty()
    @ApiProperty()
        name: string

    @ApiProperty()
        description: string

    @IsNotEmpty()
    @ApiProperty()
        priority: number

    @IsNotEmpty()
    @ApiProperty()
        direction: HeaderRuleDirection

    @IsNotEmpty()
    @ApiProperty()
        stopper: boolean

    @IsNotEmpty()
    @ApiProperty()
        enabled: boolean

    @ApiProperty()
        actions: UrlReference

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