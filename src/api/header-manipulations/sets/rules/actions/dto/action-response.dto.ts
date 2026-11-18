import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class HeaderManipulationRuleActionResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the header rule action'})
        id: number

    @IsInt()
    @Expand('header-manipulations/sets/rules')
    @ApiProperty({description: 'Header rule of the action'})
        rule_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'SIP header the action changes'})
        header: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Part of the header the action changes'})
        header_part: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Change made to the header'})
        action_type: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Part of the value that is used'})
        value_part: string

    @IsOptional()
    @IsString()
    @ApiProperty({description: 'Value used by the action'})
        value?: string

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Rewrite rule set applied to the value; null = none'})
        rwr_set_id?: number

    @IsOptional()
    @IsEnum(RwrDpEnum)
        rwr_dp?: RwrDpEnum

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Priority of the action; lower values are applied first'})
        priority?: number

    @IsOptional()
    @IsBoolean()
    @ApiProperty({description: 'Action is enabled'})
        enabled?: boolean

    constructor(entity: internal.HeaderRuleAction, options?: ResponseDtoOptions) {
        super(options)
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