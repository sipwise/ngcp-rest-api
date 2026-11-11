import {IsIn, IsOptional} from 'class-validator'

import {QueryDto} from '~/dto/query.dto'

const booleanValues = ['true', 'false', '1', '0']

export class SubscriberQueryDto extends QueryDto {
    @IsOptional()
    @IsIn(booleanValues)
        is_pbx_group?: string

    @IsOptional()
    @IsIn(booleanValues)
        is_admin?: string

    @IsOptional()
    @IsIn(booleanValues)
        is_pbx_pilot?: string
}
