import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {InvoiceTemplateResponseDto} from './invoice-response.dto'

import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

export class InvoiceTemplateSearchDto implements Partial<InvoiceTemplateResponseDto> {
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        type: InvoiceTemplateType = undefined
    @ApiPropertyOptional()
        call_direction: InvoiceTemplateCallDirection = undefined
    @ApiPropertyOptional()
        category: InvoiceTemplateCategory = undefined
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
