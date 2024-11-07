import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'

export class HeaderManipulationRuleActionResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsNotEmpty()
    @ApiProperty()
        rule_id: number

    @IsNotEmpty()
    @ApiProperty()
        header: string

    @IsNotEmpty()
    @ApiProperty()
        header_part: string

    @IsNotEmpty()
    @ApiProperty()
        action_type: string

    @IsNotEmpty()
    @ApiProperty()
        value_part: string

    @IsOptional()
    @ApiPropertyOptional()
        value?: string

    @IsOptional()
    @ApiPropertyOptional()
    @Expandable({name: 'rwr_set_id', controller: 'rewriteRuleSetController'})
        rwr_set_id?: number

    @IsEnum(RwrDpEnum)
    @IsOptional()
        rwr_dp?: RwrDpEnum

    @IsOptional()
    @ApiPropertyOptional()
        priority?: number

    @IsOptional()
    @ApiPropertyOptional()
        enabled?: boolean

    constructor(entity: internal.HeaderRuleAction) {
        this.id = entity.id
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
}