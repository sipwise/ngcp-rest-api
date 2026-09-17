import {IsEnum, IsOptional} from 'class-validator'

import {QueryDto} from '~/dto/query.dto'

export enum SubscriberPhonebookView {
    All = 'all',
    Customer = 'customer',
    Reseller = 'reseller',
}

export class SubscriberPhonebookQueryDto extends QueryDto {
    @IsOptional()
    @IsEnum(SubscriberPhonebookView)
        include?: SubscriberPhonebookView
}