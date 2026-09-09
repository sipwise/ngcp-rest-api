import {IsBooleanString, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export class CustomerQueryDto extends RequestParamDto {
    @IsOptional()
    @IsBooleanString()
        include_terminated?: string
}