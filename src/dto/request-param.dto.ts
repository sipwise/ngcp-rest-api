import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

import {ReservedQueryParamsDto} from '~/config/constants.config'

export class RequestParamDto extends ReservedQueryParamsDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        id?: number
}
