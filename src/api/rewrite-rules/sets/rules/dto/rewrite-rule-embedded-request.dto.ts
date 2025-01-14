import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional} from 'class-validator'

import {RewriteRuleRequestDto} from './rewrite-rule-request.dto'

export class RewriteRuleEmbeddedRequestDto extends RewriteRuleRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
        set_id: number
}
