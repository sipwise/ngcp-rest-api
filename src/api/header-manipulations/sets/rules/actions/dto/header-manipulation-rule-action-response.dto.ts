import {internal} from '../../../../../../entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsOptional} from 'class-validator'
import {ResponseDto} from '../../../../../../dto/response.dto'

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
        rwr_set_id?: number

    @IsOptional()
    @ApiPropertyOptional()
        rwr_dp_id?: number

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
        this.rwr_dp_id = entity.rwrDpId
        this.priority = entity.priority
        this.enabled = entity.enabled
    }
}