import {IsEnum, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export enum CustomerPhonebookView {
    All = 'all',
    Shared = 'shared',
    Reseller = 'reseller',
}

export class CustomerPhonebookQueryDto extends RequestParamDto {
    @IsOptional()
    @IsEnum(CustomerPhonebookView)
        include?: CustomerPhonebookView
}