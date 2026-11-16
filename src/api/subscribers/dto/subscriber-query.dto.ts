import {IsIn, IsOptional} from 'class-validator'

import {QueryDto} from '~/dto/query.dto'
import {errorMessage} from '~/helpers/errors.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'

const booleanOptions = {message: `$property ${errorMessage('INVALID_BOOLEAN').message}`}

export class SubscriberQueryDto extends QueryDto {
    @IsOptional()
    @IsIn(SearchLogic.acceptedBooleanValues, booleanOptions)
        is_pbx_group?: string

    @IsOptional()
    @IsIn(SearchLogic.acceptedBooleanValues, booleanOptions)
        is_admin?: string

    @IsOptional()
    @IsIn(SearchLogic.acceptedBooleanValues, booleanOptions)
        is_pbx_pilot?: string
}
