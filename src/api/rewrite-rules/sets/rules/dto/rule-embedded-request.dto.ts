import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional} from 'class-validator'

import {RewriteRuleRequestDto} from './rule-request.dto'

export class RewriteRuleEmbeddedRequestDto extends RewriteRuleRequestDto {
    @ApiPropertyOptional({description: 'Rewrite rule set of the rule, ignored on input'})
    @IsOptional()
    @IsInt()
    declare set_id: number
}
