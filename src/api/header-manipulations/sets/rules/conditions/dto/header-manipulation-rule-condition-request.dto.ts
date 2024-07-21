import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional, MaxLength} from 'class-validator'
import {RequestDto, RequestDtoOptions} from '../../../../../../dto/request.dto'
import {internal} from '../../../../../../entities'
import {HeaderRuleConditionExpression, HeaderRuleConditionMatchPart, HeaderRuleConditionMatchType, HeaderRuleConditionValueType} from '../../../../../../entities/internal/header-rule-condition.internal.entity'
import {RwrDpEnum} from '../../../../../../enums/rwr-dp.enum'
import {Requires} from '../../../../../../decorators/requires.decorator'

export class HeaderManipulationRuleConditionRequestDto implements RequestDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Rule id', example: '1'})
        rule_id: number

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionMatchType)
    @ApiProperty({description: 'Condition Match Type', example: 'header'})
        match_type: HeaderRuleConditionMatchType

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionMatchPart)
    @ApiProperty({description: 'Condition Match Part', example: 'full'})
        match_part: HeaderRuleConditionMatchPart

    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({description: 'Condition Match Name', example: 'name'})
        match_name: string

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionExpression)
    @ApiProperty({description: 'Condition Expression', example: 'is'})
        expression: HeaderRuleConditionExpression

    @IsNotEmpty()
    @ApiProperty({description: 'Condition Expression Negation', example: true})
        expression_negation: boolean

    @IsNotEmpty()
    @IsEnum(HeaderRuleConditionValueType)
    @ApiProperty({description: 'Condition Value Type', example: 'input'})
        value_type: HeaderRuleConditionValueType

    @IsOptional()
    @Requires('rwr_dp')
    @ApiPropertyOptional({description: 'Condition Rewrite Rule Set Id', example: 1})
        rwr_set_id?: number

    @IsEnum(RwrDpEnum)
    @IsOptional()
    @Requires('rwr_set_id')
    @ApiPropertyOptional({description: 'Condition Rewrite Rule', enum: RwrDpEnum, example: 'caller_in'})
        rwr_dp?: RwrDpEnum

    @IsNotEmpty()
    @ApiProperty({description: 'Condition enabled', example: true})
        enabled: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Condition Values', example: ['1', '2']})
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
        return entity
    }
}
