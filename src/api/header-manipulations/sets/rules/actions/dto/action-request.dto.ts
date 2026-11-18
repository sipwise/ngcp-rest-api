import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator'

import {DependsOn} from '~/decorators/depends-on.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {HeaderRuleActionActionType, HeaderRuleActionHeaderPart, HeaderRuleActionValuePart} from '~/entities/internal/header-rule-action.internal.entity'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'

export class HeaderManipulationRuleActionRequestDto implements RequestDto {

    @IsNotEmpty()
    @ApiProperty({description: 'Header rule of the action', example: '1'})
        rule_id: number

    @IsNotEmpty()
    @ApiProperty({description: 'SIP header the action changes', example: 'X-FOO'})
        header: string

    @IsNotEmpty()
    @IsEnum(HeaderRuleActionHeaderPart)
    @ApiProperty({description: 'Part of the header the action changes', example: 'full'})
        header_part: HeaderRuleActionHeaderPart

    @IsNotEmpty()
    @IsEnum(HeaderRuleActionActionType)
    @ApiProperty({description: 'Change made to the header', example: 'set'})
        action_type: HeaderRuleActionActionType

    @IsNotEmpty()
    @IsEnum(HeaderRuleActionValuePart)
    @ApiProperty({description: 'Part of the value that is used', example: 'full'})
        value_part: HeaderRuleActionValuePart

    @IsOptional()
    @ApiPropertyOptional({description: 'Value used by the action', example: 'bar'})
        value?: string

    @IsOptional()
    @DependsOn('rwr_dp')
    @ApiPropertyOptional({description: 'Rewrite rule set applied to the value; null = none', example: 1})
        rwr_set_id?: number

    @IsEnum(RwrDpEnum)
    @IsOptional()
    @DependsOn('rwr_set_id')
    @ApiPropertyOptional({description: 'Rewrite rules of the set that are applied, by field and direction', enum: RwrDpEnum, example: 'caller_in'})
        rwr_dp?: RwrDpEnum

    @IsOptional()
    @ApiPropertyOptional({description: 'Priority of the action; lower values are applied first', example: 100})
        priority?: number

    @IsOptional()
    @ApiPropertyOptional({description: 'Action is enabled', example: true})
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
        this.rwr_dp = entity.rwrDp
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
        entity.rwrDp = this.rwr_dp
        entity.priority = this.priority ?? 100
        entity.enabled = this.enabled
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
