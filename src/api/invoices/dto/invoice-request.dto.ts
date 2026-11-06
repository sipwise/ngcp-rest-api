import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional, Matches} from 'class-validator'

import {invoicePeriod} from '~/api/invoices/invoice-generator'
import {RequestDto} from '~/dto/request.dto'
import {internal} from '~/entities'
import {DtoFields, withDtoFields} from '~/helpers/dto-fields.helper'

const dateTimePattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/

export class InvoiceRequestDto implements RequestDto {
    static readonly dtoFields: DtoFields<internal.Invoice, InvoiceRequestDto> = {contractId: 'customer_id'}

    @ApiProperty({description: 'Contract to create the invoice for: a customer for customer and did templates, a peering contract for peer templates, a reseller contract for reseller templates'})
    @IsInt()
        customer_id!: number

    @ApiProperty({description: 'Invoice template, its category and call direction define the invoice content'})
    @IsInt()
        template_id!: number

    @ApiPropertyOptional({description: 'Calendar month of the invoice in server local time, required without period_start', example: '2026-10'})
    @IsOptional()
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {message: 'period must be YYYY-MM'})
        period?: string

    @ApiPropertyOptional({description: 'Period start in server local time (`YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`), takes precedence over period', example: '2026-10-01 00:00:00'})
    @IsOptional()
    @Matches(dateTimePattern, {message: 'period_start must be YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'})
        period_start?: string

    @ApiPropertyOptional({description: 'Period end in server local time, defaults to period_start + 1 month - 1 second', example: '2026-10-31 23:59:59'})
    @IsOptional()
    @Matches(dateTimePattern, {message: 'period_end must be YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'})
        period_end?: string

    toInternal(): internal.Invoice {
        const invoice = new internal.Invoice()
        const {start, end} = invoicePeriod(this.period, this.period_start, this.period_end)
        invoice.contractId = this.customer_id
        invoice.templateId = this.template_id
        invoice.periodStart = start
        invoice.periodEnd = end
        return withDtoFields(invoice, InvoiceRequestDto.dtoFields)
    }
}
