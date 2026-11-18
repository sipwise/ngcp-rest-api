import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsEnum, IsInt, IsNumber, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {DateTimeField, LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {InvoiceGenerator} from '~/entities/internal/invoice.internal.entity'
import {setOwnerTimezone} from '~/helpers/timezone.helper'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class InvoiceResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the invoice'})
        id: number

    @IsInt()
    @Expand('contracts')
    @ApiProperty({description: 'Contract of the invoice, also for peering and reseller contracts'})
        customer_id: number

    @IsString()
    @ApiProperty({description: 'Serial number of the invoice', example: 'INV2026010000042'})
        serial: string

    @LocalDateTimeField()
    @IsDate()
    @ApiProperty({description: 'Start of the invoice period', type: Date})
        period_start: Date

    @LocalDateTimeField()
    @IsDate()
    @ApiProperty({description: 'End of the invoice period', type: Date})
        period_end: Date

    @IsNumber()
    @ApiProperty({description: 'Net amount in currency units'})
        amount_net: number

    @IsNumber()
    @ApiProperty({description: 'VAT amount in currency units'})
        amount_vat: number

    @IsNumber()
    @ApiProperty({description: 'Total amount in currency units'})
        amount_total: number

    @DateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({type: Date, nullable: true, description: 'Time the invoice was sent by email'})
        sent_date: Date | null

    @CanBeNull()
    @IsEnum(InvoiceGenerator)
    @ApiProperty({enum: InvoiceGenerator, nullable: true, description: 'Generator of the invoice, null when created via the API'})
        generator: InvoiceGenerator | null

    constructor(entity: internal.Invoice, options?: ResponseDtoOptions) {
        super(options)
        if (!entity) return

        this.id = entity.id
        this.customer_id = entity.contractId
        this.serial = entity.serial
        this.period_start = entity.periodStart
        this.period_end = entity.periodEnd
        this.amount_net = entity.amountNet
        this.amount_vat = entity.amountVat
        this.amount_total = entity.amountTotal
        this.sent_date = entity.sentDate ?? null
        this.generator = entity.generator ?? null
        setOwnerTimezone(this, entity.ownerTimezone)
    }
}
