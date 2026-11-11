import {IsIn, IsOptional} from 'class-validator'

import {QueryDto} from '~/dto/query.dto'
import {SearchLogic} from '~/helpers/search-logic.helper'

export class SubscriberQueryDto extends QueryDto {
    @IsOptional()
    @IsIn(SearchLogic.booleanValues)
        is_pbx_group?: string

    @IsOptional()
    @IsIn(SearchLogic.booleanValues)
        is_admin?: string

    @IsOptional()
    @IsIn(SearchLogic.booleanValues)
        is_pbx_pilot?: string
}
