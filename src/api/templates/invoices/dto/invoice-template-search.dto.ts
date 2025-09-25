import {InvoiceTemplateResponseDto} from './invoice-template-response.dto'

import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

export class InvoiceTemplateSearchDto implements Partial<InvoiceTemplateResponseDto> {
    id: number = undefined
    name: string = undefined
    reseller_id: number = undefined
    type: InvoiceTemplateType = undefined
    call_direction: InvoiceTemplateCallDirection = undefined
    category: InvoiceTemplateCategory = undefined
}
