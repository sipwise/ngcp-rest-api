import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export class RewriteRuleRequestParamDto extends RequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        setId?: number
}