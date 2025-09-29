import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export class PeeringRuleRequestParamDto extends RequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        groupId?: number
}