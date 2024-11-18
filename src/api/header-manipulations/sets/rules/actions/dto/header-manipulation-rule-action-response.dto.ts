import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'

export class HeaderManipulationRuleActionResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        rule_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        header: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        header_part: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        action_type: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        value_part: string

    @IsOptional()
    @IsString()
    @ApiProperty()
        value?: string

    @CanBeNull()
    @IsInt()
    @ApiProperty()
    @Expandable({name: 'rwr_set_id', controller: 'rewriteRuleSetController'})
        rwr_set_id?: number

    @IsOptional()
    @IsEnum(RwrDpEnum)
        rwr_dp?: RwrDpEnum

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        priority?: number

    @IsOptional()
    @IsBoolean()
    @ApiProperty()
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