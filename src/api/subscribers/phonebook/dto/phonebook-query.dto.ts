import {ApiPropertyOptional} from '@nestjs/swagger'
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
    @ApiPropertyOptional({
        description: 'Also include read-only entries: `customer` adds the shared entries of the other subscribers of the customer, `reseller` adds the reseller phonebook, `all` adds both',
        enum: SubscriberPhonebookView,
    })
        include?: SubscriberPhonebookView
}