import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator'
import {RequestDto, RequestDtoOptions} from '../../../../../../dto/request.dto'
import {internal} from '../../../../../../entities'
import {HeaderRuleActionActionType, HeaderRuleActionHeaderPart, HeaderRuleActionValuePart} from '../../../../../../entities/internal/header-rule-action.internal.entity'

export class HeaderManipulationRuleActionRequestDto implements RequestDto {

    @IsNotEmpty()
    @ApiProperty({description: 'Rule id', example: '1'})
        rule_id: number

    @IsNotEmpty()
    @ApiProperty({description: 'Action header', example: 'X-FOO'})
        header: string

    @IsNotEmpty()
    @IsEnum(HeaderRuleActionHeaderPart)
    @ApiProperty({description: 'Action header part', example: 'full'})
        header_part: HeaderRuleActionHeaderPart

    @IsNotEmpty()
    @IsEnum(HeaderRuleActionActionType)
    @ApiProperty({description: 'Action type', example: 'set'})
        action_type: HeaderRuleActionActionType

    @IsNotEmpty()
    @IsEnum(HeaderRuleActionValuePart)
    @ApiProperty({description: 'Action value part', example: 'full'})
        value_part: HeaderRuleActionValuePart

    @IsOptional()
    @ApiPropertyOptional({description: 'Action value', example: 'bar'})
        value?: string

    @IsOptional()
    @ApiPropertyOptional({description: 'Action RWR Set ID', example: 1})
        rwr_set_id?: number

    @IsOptional()
    @ApiPropertyOptional({description: 'Action RWR DP ID', example: 1})
        rwr_dp_id?: number

    @IsOptional()
    @ApiPropertyOptional({description: 'Action priority', example: 100})
        priority?: number

    @IsOptional()
    @ApiPropertyOptional({description: 'Action enabled', example: true})
        enabled?: boolean

    constructor(entity?: internal.HeaderRuleAction) {
        if (!entity)
            return
        this.rule_id = entity.ruleId
        this.header = entity.header
        this.header_part = entity.headerPart
        this.action_type = entity.actionType
        this.value_part = entity.valuePart
        this.value = entity.value
        this.rwr_set_id = entity.rwrSetId
        this.rwr_dp_id = entity.rwrDpId
        this.priority = entity.priority
        this.enabled = entity.enabled
    }

    toInternal(options: RequestDtoOptions = {}): internal.HeaderRuleAction {
        const entity = new internal.HeaderRuleAction()
        entity.ruleId = this.rule_id
        entity.header = this.header
        entity.headerPart = this.header_part
        entity.actionType = this.action_type
        entity.valuePart = this.value_part
        entity.value = this.value
        entity.rwrSetId = this.rwr_set_id
        entity.rwrDpId = this.rwr_dp_id
        entity.priority = this.priority
        entity.enabled = this.enabled
        if (options.id)
            entity.id = options.id
        return entity
    }
}
