import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {VoipPeeringInboundRuleField} from '~/entities/internal/voip-peering-inbound-rule.internal.entity'

export class PeeringInboundRuleRequestDto implements RequestDto {
    @IsInt()
    @IsPositive()
    @ApiProperty()
        group_id: number

    @IsEnum(VoipPeeringInboundRuleField)
    @ApiProperty({type: 'enum', enum: VoipPeeringInboundRuleField})
        field: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(1023)
    @ApiProperty()
        pattern: string

    @IsOptional()
    @IsInt()
    @IsPositive()
    @Min(400)
    @ApiPropertyOptional()
        reject_code?: number

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiPropertyOptional()
        reject_reason?: string

    @IsInt()
    @IsPositive()
    @ApiProperty()
        priority: number

    @IsBoolean()
    @ApiProperty()
        enabled: boolean

    constructor(entity?: internal.VoipPeeringInboundRule) {
        if (!entity)
            return
        this.group_id = entity.groupId
        this.field = entity.field
        this.pattern = entity.pattern
        this.reject_code = entity.rejectCode
        this.reject_reason = entity.rejectReason
        this.priority = entity.priority
        this.enabled = entity.enabled
    }

    toInternal(options: RequestDtoOptions = {}): internal.VoipPeeringInboundRule {
        const entity = new internal.VoipPeeringInboundRule()
        entity.groupId = this.group_id
        entity.field = this.field
        entity.pattern = this.pattern
        entity.rejectCode = this.reject_code
        entity.rejectReason = this.reject_reason
        entity.priority = this.priority
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
