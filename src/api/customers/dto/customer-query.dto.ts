import {IsBooleanString, IsOptional} from 'class-validator'

import {QueryDto} from '~/dto/query.dto'

export class CustomerQueryDto extends QueryDto {
    @IsOptional()
    @IsBooleanString()
        include_terminated?: string
}