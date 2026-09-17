import {IsEnum, IsOptional} from 'class-validator'

import {QueryDto} from '~/dto/query.dto'

export enum CustomerPhonebookView {
    All = 'all',
    Shared = 'shared',
    Reseller = 'reseller',
}

export class CustomerPhonebookQueryDto extends QueryDto {
    @IsOptional()
    @IsEnum(CustomerPhonebookView)
        include?: CustomerPhonebookView
}