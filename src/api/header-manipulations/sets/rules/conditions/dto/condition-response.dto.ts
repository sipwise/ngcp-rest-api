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
    @ApiProperty()
        id: number

    @IsInt()
    @Expand('header-manipulations/sets/rules')
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
        rwr_set_id?: number

    @IsOptional()
    @IsEnum(RwrDpEnum)
    @ApiProperty()
        rwr_dp?: RwrDpEnum

    @IsBoolean()
    @ApiProperty()
        enabled: boolean

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => HeaderManipulationRuleConditionValueResponseDto)
    @ApiProperty({type: [HeaderManipulationRuleConditionValueResponseDto]})
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