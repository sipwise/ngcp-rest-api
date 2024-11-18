import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class HeaderManipulationRuleConditionResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        rule_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        match_type: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        match_part: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        match_name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        expression: string

    @IsBoolean()
    @ApiProperty()
        expression_negation: boolean

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        value_type: string

    @CanBeNull()
    @IsInt()
    @ApiProperty()
    @Expandable({name: 'rwr_set_id', controller: 'rewriteRuleSetController'})
        rwr_set_id?: number

    @IsOptional()
    @IsEnum(RwrDpEnum)
    @ApiProperty()
        rwr_dp?: RwrDpEnum

    @IsBoolean()
    @ApiProperty()
        enabled: boolean

    @ValidateNested({each: true})
    @Type(() => UrlReference)
    @ApiProperty()
        values: UrlReference

    constructor(entity?: internal.HeaderRuleCondition) {
        if (!entity)
            return
        this.id = entity.id
        this.rule_id = entity.ruleId
        this.match_type = entity.matchType
        this.match_part = entity.matchPart
        this.match_name = entity.matchName
        this.expression = entity.expression
        this.expression_negation = entity.expressionNegation
        this.value_type = entity.valueType
        this.rwr_set_id = entity.rwrSetId
        this.rwr_dp = entity.rwrDp
        this.enabled = entity.enabled
        this.values = {
            type: UrlReferenceType.Link,
            url: `/sets/rules/conditions/${entity.id}/@values`,
        }
    }
}