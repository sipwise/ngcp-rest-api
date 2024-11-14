import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleRequestDto implements RequestDto {
    @ApiProperty()
    @IsInt()
        set_id!: number

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
        match_pattern!: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
        replace_pattern!: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
        description!: string

    @ApiProperty()
    @IsEnum(RewriteRuleDirection)
        direction!: RewriteRuleDirection

    @ApiProperty()
    @IsEnum(RewriteRuleField)
        field!: RewriteRuleField

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
        priority?: number

    @ApiProperty()
    @IsBoolean()
        enabled!: boolean

    constructor(entity?: internal.RewriteRule) {
        if (!entity)
            return
        this.set_id = entity.setId

    }

    toInternal(options: RequestDtoOptions = {}): internal.RewriteRule {
        const entity = new internal.RewriteRule()
        entity.setId = this.set_id
        entity.matchPattern = this.match_pattern
        entity.replacePattern = this.replace_pattern
        entity.description = this.description
        entity.direction = this.direction
        entity.field = this.field
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
