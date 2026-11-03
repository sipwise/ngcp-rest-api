import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {InvoiceGenerator} from '~/entities/internal/invoice.internal.entity'

export class InvoiceSearchDto {
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        customer_id: number
    @ApiPropertyOptional({description: 'Reseller of the contract contact'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Serial, `*` as wildcard'})
        serial: string
    @ApiPropertyOptional({enum: InvoiceGenerator})
        generator: InvoiceGenerator
    @ApiPropertyOptional({description: 'Invoices with period_start >= the value'})
        period_start_ge: string
    @ApiPropertyOptional({description: 'Invoices with period_end <= the value'})
        period_end_le: string
    @ApiHideProperty()
        _alias = {
            id: 'invoice.id',
            customer_id: 'invoice.contract_id',
            reseller_id: 'contact.reseller_id',
            serial: 'invoice.serial',
            generator: 'invoice.generator',
            period_start_ge: {
                field: 'period_start',
                comparator: '>=',
                format: (args: string[]): string => args[0],
            },
            period_end_le: {
                field: 'period_end',
                comparator: '<=',
                format: (args: string[]): string => args[0],
            },
        }
}
