import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional, Matches} from 'class-validator'

import {LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {RequestDto} from '~/dto/request.dto'
import {internal} from '~/entities'
import {DtoFields, withDtoFields} from '~/helpers/dto-fields.helper'

export class InvoiceRequestDto implements RequestDto {
    static readonly dtoFields: DtoFields<internal.Invoice, InvoiceRequestDto> = {contractId: 'customer_id'}

    @ApiProperty({description: 'Contract to create the invoice for: a customer for customer and did templates, a peering contract for peer templates, a reseller contract for reseller templates'})
    @IsInt()
        customer_id!: number

    @ApiProperty({description: 'Invoice template, its category and call direction define the invoice content'})
    @IsInt()
        template_id!: number

    @ApiPropertyOptional({description: 'Calendar month of the invoice in the billing timezone of the customer (its own timezone for profile packages with a `1st_tz`/`create_tz` balance interval start mode, else the platform timezone), required without period_start', example: '2026-10'})
    @IsOptional()
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {message: 'period must be YYYY-MM'})
        period?: string

    @LocalDateTimeField()
    @ApiPropertyOptional({description: 'Period start, takes precedence over period', example: '2026-10-01 00:00:00'})
    @IsOptional()
        period_start?: Date

    @LocalDateTimeField()
    @ApiPropertyOptional({description: 'Period end, defaults to period_start + 1 month - 1 second (period: the end of the month)', example: '2026-10-31 23:59:59'})
    @IsOptional()
        period_end?: Date

    toInternal(): internal.Invoice {
        const invoice = new internal.Invoice()
        invoice.contractId = this.customer_id
        invoice.templateId = this.template_id
        invoice.period = this.period
        invoice.periodStart = this.period_start
        invoice.periodEnd = this.period_end
        return withDtoFields(invoice, InvoiceRequestDto.dtoFields)
    }
}
