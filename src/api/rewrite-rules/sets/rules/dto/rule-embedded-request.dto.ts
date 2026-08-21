import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional} from 'class-validator'

import {RewriteRuleRequestDto} from './rule-request.dto'

export class RewriteRuleEmbeddedRequestDto extends RewriteRuleRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    declare set_id: number
}
