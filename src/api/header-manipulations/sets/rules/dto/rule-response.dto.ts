import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'
import {UrlReferenceType} from 'enums/url-reference-type.enum'
import {UrlReference} from 'types/url-reference.type'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'


export class HeaderManipulationRuleResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the header rule'})
        id: number

    @IsInt()
    @Expand('header-manipulations/sets')
    @ApiProperty({description: 'Header rule set of the rule'})
        set_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the rule'})
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Description of the rule'})
        description: string

    @IsInt()
    @ApiProperty({description: 'Priority of the rule; lower values are processed first'})
        priority: number

    @IsEnum(HeaderRuleDirection)
    @ApiProperty({description: 'Call leg and direction the rule applies to'})
        direction: HeaderRuleDirection

    @IsBoolean()
    @ApiProperty({description: 'No further rules are processed when this rule matches'})
        stopper: boolean

    @IsBoolean()
    @ApiProperty({description: 'Rule is enabled'})
        enabled: boolean

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the actions of the rule'})
        actions: UrlReference

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the conditions of the rule'})
        conditions: UrlReference

    constructor(entity: internal.HeaderRule, options?: ResponseDtoOptions) {
        super(options)
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
            url: `${this.resourceUrl}/${entity.id}/actions`,
        }
        this.conditions = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/conditions`,
        }
    }
}