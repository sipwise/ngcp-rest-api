import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export class CustomerBalanceRequestParamDto extends RequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        customerId?: number
}