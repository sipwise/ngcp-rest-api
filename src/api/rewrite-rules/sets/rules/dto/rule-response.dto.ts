import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class RewriteRuleResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the rewrite rule'})
        id!: number

    @IsInt()
    @Expand('rewrite-rules/sets')
    @ApiProperty({description: 'Rewrite rule set of the rule'})
        set_id!: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'PCRE regex the number is matched against'})
        match_pattern!: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Replacement for the matched number, may use the regex groups (`\\1`)'})
        replace_pattern!: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Description of the rule'})
        description!: string

    @IsEnum(RewriteRuleDirection)
    @ApiProperty({description: 'Direction the rule applies to: `in` inbound, `out` outbound, `lnp` number portability'})
        direction!: RewriteRuleDirection

    @IsEnum(RewriteRuleField)
    @ApiProperty({description: 'Number the rule rewrites: `caller` or `callee`'})
        field!: RewriteRuleField

    @IsInt()
    @ApiProperty({description: 'Priority of the rule, unique within the set, direction and field; lower values are applied first'})
        priority!: number

    @IsBoolean()
    @ApiProperty({description: 'Rule is enabled'})
        enabled!: boolean

    constructor(entity: internal.RewriteRule, options?: ResponseDtoOptions) {
        super(options)
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
