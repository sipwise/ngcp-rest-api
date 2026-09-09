import {IsEnum, IsOptional} from 'class-validator'

import {RequestParamDto} from '~/dto/request-param.dto'

export enum SubscriberPhonebookView {
    All = 'all',
    Customer = 'customer',
    Reseller = 'reseller',
}

export class SubscriberPhonebookQueryDto extends RequestParamDto {
    @IsOptional()
    @IsEnum(SubscriberPhonebookView)
        include?: SubscriberPhonebookView
}