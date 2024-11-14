import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleResponsetDto implements ResponseDto {
    @ApiProperty()
    @IsInt()
        id!: number

    @ApiProperty()
    @IsInt()
    @Expandable({name: 'set_id', controller: 'rewriteRuleSetController'})
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
    @IsInt()
        priority?: number

    @ApiProperty()
    @IsBoolean()
        enabled!: boolean

    constructor(entity: internal.RewriteRule) {
        this.id = entity.id
        this.set_id = entity.setId
        this.match_pattern = entity.matchPattern
        this.replace_pattern = entity.replacePattern
        this.description = entity.description
        this.direction = entity.direction
        this.field = entity.field
        this.priority = entity.priority
        this.enabled = entity.enabled
    }
}
