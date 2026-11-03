import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsEnum, IsInt, IsNumber, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {InvoiceGenerator} from '~/entities/internal/invoice.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class InvoiceResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty({description: 'Contract of the invoice, also for peering and reseller contracts'})
    @Expandable({name: 'customer_id', controller: 'contractController'})
        customer_id: number

    @IsString()
    @ApiProperty({example: 'INV2026010000042'})
        serial: string

    @IsDate()
    @ApiProperty({type: Date})
        period_start: Date

    @IsDate()
    @ApiProperty({type: Date})
        period_end: Date

    @IsNumber()
    @ApiProperty({description: 'Net amount in cents'})
        amount_net: number

    @IsNumber()
    @ApiProperty({description: 'VAT amount in cents'})
        amount_vat: number

    @IsNumber()
    @ApiProperty({description: 'Total amount in cents'})
        amount_total: number

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
    }
}
