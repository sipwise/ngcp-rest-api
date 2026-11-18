import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator'

import {HeaderManipulationRuleConditionValueResponseDto} from './condition-value-response.dto'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {lazyArray} from '~/helpers/lazy-field.helper'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class HeaderManipulationRuleConditionResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the header rule condition'})
        id: number

    @IsInt()
    @Expand('header-manipulations/sets/rules')
    @ApiProperty({description: 'Header rule of the condition'})
        rule_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Source of the matched value: a SIP header, a preference or an AVP'})
        match_type: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Part of the source value that is matched'})
        match_part: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the header, preference or AVP matched'})
        match_name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Comparison of the source value with the values'})
        expression: string

    @IsBoolean()
    @ApiProperty({description: 'Result of the comparison is negated'})
        expression_negation: boolean

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Type of the values: literal input, a preference or an AVP'})
        value_type: string

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Rewrite rule set applied to the source value; null = none'})
        rwr_set_id?: number

    @IsOptional()
    @IsEnum(RwrDpEnum)
    @ApiProperty({description: 'Rewrite rules of the set that are applied, by field and direction'})
        rwr_dp?: RwrDpEnum

    @IsBoolean()
    @ApiProperty({description: 'Condition is enabled'})
        enabled: boolean

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => HeaderManipulationRuleConditionValueResponseDto)
    @ApiProperty({description: 'Values the source value is compared with', type: [HeaderManipulationRuleConditionValueResponseDto]})
        values: HeaderManipulationRuleConditionValueResponseDto[]

    constructor(entity?: internal.HeaderRuleCondition, options?: ResponseDtoOptions) {
        super(options)
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
        this.values = lazyArray(
            entity.storedValues?.map(value => new HeaderManipulationRuleConditionValueResponseDto(value)),
            entity.lazyCounts?.storedValues,
        )
    }
}