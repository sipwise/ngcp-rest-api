import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export class PeeringInboundRuleRequestParamDto extends RequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        groupId?: number
}