import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

export class RewriteRuleResponsetDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id!: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'set_id', controller: 'rewriteRuleSetController'})
        set_id!: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        match_pattern!: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        replace_pattern!: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        description!: string

    @IsEnum(RewriteRuleDirection)
    @ApiProperty()
        direction!: RewriteRuleDirection

    @IsEnum(RewriteRuleField)
    @ApiProperty()
        field!: RewriteRuleField

    @IsInt()
    @ApiProperty()
        priority!: number

    @IsBoolean()
    @ApiProperty()
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
