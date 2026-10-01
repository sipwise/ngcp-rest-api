import {ApiProperty} from '@nestjs/swagger'

import {
    InvoiceTemplateBillingProfileVars,
    InvoiceTemplateContactVars,
    InvoiceTemplateCustomerVars,
    InvoiceTemplateInvoiceVars,
} from './invoice-vars.dto'

import {getDerivedVariables} from '~/api/templates/invoices/invoice-layout'
import {InvoiceTemplateSubstitutionVars} from '~/api/templates/invoices/invoice-template.vars'
import {ResponseDto} from '~/dto/response.dto'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class InvoiceTemplateAuxVars {
    @ApiProperty({example: 1, description: 'Current page number'})
        page: number = 1
}

/**
 * Variables (with example values) and functions which can be used in invoice templates
 */
export class InvoiceTemplateVarsResponseDto extends ResponseDto {
    @ApiProperty({type: () => InvoiceTemplateContactVars, description: 'Reseller contact'})
        rescontact: InvoiceTemplateContactVars

    @ApiProperty({type: () => InvoiceTemplateCustomerVars})
        customer: InvoiceTemplateCustomerVars

    @ApiProperty({type: () => InvoiceTemplateContactVars, description: 'Customer contact'})
        custcontact: InvoiceTemplateContactVars

    @ApiProperty({type: () => InvoiceTemplateBillingProfileVars})
        billprof: InvoiceTemplateBillingProfileVars

    @ApiProperty({type: () => InvoiceTemplateInvoiceVars})
        invoice: InvoiceTemplateInvoiceVars

    @ApiProperty({example: '29.90', description: 'Fixed fee (billing profile interval charge)'})
        fixfee: string

    @ApiProperty({example: '60.00', description: 'Total cost of the zones (per subscriber within `<!--@foreach-did-->`)'})
        zonefee: string

    @ApiProperty({example: '60.00', description: 'Net amount'})
        netfee: string

    @ApiProperty({example: '0.00', description: 'VAT amount'})
        vatfee: string

    @ApiProperty({example: '60.00', description: 'Total amount'})
        allfee: string

    @ApiProperty({example: 'EUR', description: 'Currency of the billing profile'})
        cur: string

    @ApiProperty({example: '2026-09-01', description: 'Invoice period start (date)'})
        p_start: string

    @ApiProperty({example: '2026-09-30', description: 'Invoice period end (date)'})
        p_end: string

    @ApiProperty({type: () => InvoiceTemplateAuxVars, description: 'Layout state, maintained by the layout markers'})
        aux: InvoiceTemplateAuxVars

    @ApiProperty({example: 'date_now(format=\'%Y-%m-%d\')', description: 'Function returning the current date, the format is optional (strftime)'})
        'date_now()': string

    constructor(vars: InvoiceTemplateSubstitutionVars, options?: ResponseDtoOptions) {
        super(options)
        if (!vars) return
        this.rescontact = vars.rescontact
        this.customer = vars.customer
        this.custcontact = vars.custcontact
        this.billprof = vars.billprof
        this.invoice = vars.invoice
        Object.assign(this, getDerivedVariables(vars as unknown as Record<string, unknown>))
        this.aux = new InvoiceTemplateAuxVars()
        this['date_now()'] = 'date_now(format=\'%Y-%m-%d\')'
    }
}
