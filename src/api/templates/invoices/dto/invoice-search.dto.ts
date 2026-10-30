import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {InvoiceTemplateResponseDto} from './invoice-response.dto'

import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

export class InvoiceTemplateSearchDto implements Partial<InvoiceTemplateResponseDto> {
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        type: InvoiceTemplateType
    @ApiPropertyOptional()
        call_direction: InvoiceTemplateCallDirection
    @ApiPropertyOptional()
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
