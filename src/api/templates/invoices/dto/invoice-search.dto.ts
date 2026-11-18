import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {InvoiceTemplateResponseDto} from './invoice-response.dto'

import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

export class InvoiceTemplateSearchDto implements Partial<InvoiceTemplateResponseDto> {
    @ApiPropertyOptional({description: 'Id of the invoice template'})
        id: number
    @ApiPropertyOptional({description: 'Name of the invoice template'})
        name: string
    @ApiPropertyOptional({description: 'Reseller of the template; null for `peer` and `reseller` templates'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Template format'})
        type: InvoiceTemplateType
    @ApiPropertyOptional({description: 'Calls listed on the invoice: `in` incoming, `out` outgoing, `in_out` both'})
        call_direction: InvoiceTemplateCallDirection
    @ApiPropertyOptional({description: 'Contract the invoices are for: `customer`, `did` (customer, per number), `peer` or `reseller`'})
        category: InvoiceTemplateCategory
    @ApiHideProperty()
        _alias = {
            id: 'template.id',
            name: 'template.name',
            reseller_id: 'template.reseller_id',
            type: 'template.type',
            call_direction: 'template.call_direction',
            category: 'template.category',
        }
}
