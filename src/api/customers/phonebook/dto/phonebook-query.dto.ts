import {ApiPropertyOptional} from '@nestjs/swagger'
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
    @ApiPropertyOptional({
        description: 'Also include read-only entries: `shared` adds the shared subscriber entries of the customer, `reseller` adds the reseller phonebook, `all` adds both',
        enum: CustomerPhonebookView,
    })
        include?: CustomerPhonebookView
}