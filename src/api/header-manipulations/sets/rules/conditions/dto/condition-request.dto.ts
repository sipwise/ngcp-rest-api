import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional, MaxLength} from 'class-validator'

import {DependsOn} from '~/decorators/depends-on.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {HeaderRuleConditionExpression, HeaderRuleConditionMatchPart, HeaderRuleConditionMatchType, HeaderRuleConditionValueType} from '~/entities/internal/header-rule-condition.internal.entity'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'

export class HeaderManipulationRuleConditionRequestDto implements RequestDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Header rule of the condition', example: '1'})
        rule_id: number

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionMatchType)
    @ApiProperty({description: 'Source of the matched value: a SIP header, a preference or an AVP', example: 'header'})
        match_type: HeaderRuleConditionMatchType

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionMatchPart)
    @ApiProperty({description: 'Part of the source value that is matched', example: 'full'})
        match_part: HeaderRuleConditionMatchPart

    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({description: 'Name of the header, preference or AVP matched', example: 'name'})
        match_name: string

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionExpression)
    @ApiProperty({description: 'Comparison of the source value with the values', example: 'is'})
        expression: HeaderRuleConditionExpression

    @IsNotEmpty()
    @ApiProperty({description: 'Result of the comparison is negated', example: true})
        expression_negation: boolean

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionValueType)
    @ApiProperty({description: 'Type of the values: literal input, a preference or an AVP', example: 'input'})
        value_type: HeaderRuleConditionValueType

    @IsOptional()
    @DependsOn('rwr_dp')
    @ApiPropertyOptional({description: 'Rewrite rule set applied to the source value; null = none', example: 1})
        rwr_set_id?: number

    @IsEnum(RwrDpEnum)
    @IsOptional()
    @DependsOn('rwr_set_id')
    @ApiPropertyOptional({description: 'Rewrite rules of the set that are applied, by field and direction', enum: RwrDpEnum, example: 'caller_in'})
        rwr_dp?: RwrDpEnum

    @IsNotEmpty()
    @ApiProperty({description: 'Condition is enabled', example: true})
        enabled: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Values the source value is compared with', example: ['1', '2']})
        values?: string[]

    constructor(entity?: internal.HeaderRuleCondition) {
        if (!entity)
            return
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
        this.values = entity.values
    }

    toInternal(options: RequestDtoOptions = {}): internal.HeaderRuleCondition {
        const entity = new internal.HeaderRuleCondition()
        entity.ruleId = this.rule_id
        entity.matchType = this.match_type
        entity.matchPart = this.match_part
        entity.matchName = this.match_name
        entity.expression = this.expression
        entity.expressionNegation = this.expression_negation
        entity.valueType = this.value_type
        entity.rwrSetId = this.rwr_set_id
        entity.rwrDp = this.rwr_dp
        entity.enabled = this.enabled
        entity.values = this.values
        if (options.id)
            entity.id = options.id

        if (options.assignNulls) {
            Object.keys(entity).forEach(k => {
                if (entity[k] === undefined)
                    entity[k] = null
            })
        }
        return entity
    }
}
