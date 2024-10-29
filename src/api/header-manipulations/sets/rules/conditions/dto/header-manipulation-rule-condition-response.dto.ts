import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class HeaderManipulationRuleConditionResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsNotEmpty()
    @ApiProperty()
        rule_id: number

    @IsNotEmpty()
    @ApiProperty()
        match_type: string

    @IsNotEmpty()
    @ApiProperty()
        match_part: string

    @IsNotEmpty()
    @ApiProperty()
        match_name: string

    @IsNotEmpty()
    @ApiProperty()
        expression: string

    @IsNotEmpty()
    @ApiProperty()
        expression_negation: boolean

    @IsNotEmpty()
    @ApiProperty()
        value_type: string

    @IsOptional()
    @ApiPropertyOptional()
        rwr_set_id?: number

    @IsEnum(RwrDpEnum)
    @IsOptional()
        rwr_dp?: RwrDpEnum

    @IsNotEmpty()
    @ApiProperty()
        enabled: boolean

    @IsNotEmpty()
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