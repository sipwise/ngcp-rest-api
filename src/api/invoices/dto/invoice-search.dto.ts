import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {DateTimeKind, LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {InvoiceGenerator} from '~/entities/internal/invoice.internal.entity'
import {dateTimeFilter} from '~/helpers/query-builder.helper'

export class InvoiceSearchDto {
    @ApiPropertyOptional({description: 'Id of the invoice'})
        id: number
    @ApiPropertyOptional({description: 'Contract of the invoice'})
        customer_id: number
    @ApiPropertyOptional({description: 'Reseller of the contract contact'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Serial number of the invoice'})
        serial: string
    @ApiPropertyOptional({description: 'Generator of the invoice', enum: InvoiceGenerator})
        generator: InvoiceGenerator
    @LocalDateTimeField()
    @ApiPropertyOptional({description: 'Invoices with period_start >= the value'})
        period_start_ge: Date
    @LocalDateTimeField()
    @ApiPropertyOptional({description: 'Invoices with period_end <= the value'})
        period_end_le: Date
    @ApiHideProperty()
        _alias = {
            id: 'invoice.id',
            customer_id: 'invoice.contract_id',
            reseller_id: 'contact.reseller_id',
            serial: 'invoice.serial',
            generator: 'invoice.generator',
            period_start_ge: dateTimeFilter(DateTimeKind.LocalDateTime, 'invoice.period_start', '>='),
            period_end_le: dateTimeFilter(DateTimeKind.LocalDateTime, 'invoice.period_end', '<='),
        }
}
