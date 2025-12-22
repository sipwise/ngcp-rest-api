import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class PeeringRuleRequestDto implements RequestDto {
    @IsOptional()
    @IsInt()
    @IsPositive()
    @ApiPropertyOptional()
        group_id: number

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiPropertyOptional()
        callee_prefix?: string

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiPropertyOptional()
        callee_pattern?: string

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiPropertyOptional()
        caller_pattern?: string

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    @ApiProperty()
        description: string

    @IsBoolean()
    @ApiProperty()
        enabled: boolean

    @IsBoolean()
    @ApiProperty()
        stopper: boolean

    constructor(entity?: internal.VoipPeeringRule) {
        if (!entity)
            return
        this.group_id = entity.groupId
        this.callee_prefix = entity.calleePrefix
        this.callee_pattern = entity.calleePattern
        this.caller_pattern = entity.callerPattern
        this.description = entity.description
        this.enabled = entity.enabled
        this.stopper = entity.stopper
    }

    toInternal(options: RequestDtoOptions = {}): internal.VoipPeeringRule {
        const entity = new internal.VoipPeeringRule()
        entity.groupId = this.group_id || options.parentId
        entity.calleePrefix = this.callee_prefix
        entity.calleePattern = this.callee_pattern
        entity.callerPattern = this.caller_pattern
        entity.description = this.description
        entity.enabled = this.enabled
        entity.stopper = this.stopper
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
