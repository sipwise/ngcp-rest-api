import {ApiProperty} from '@nestjs/swagger'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class InvoiceTemplateResponseDto extends ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
        name: string

    @ApiProperty()
    @Expandable({controller: 'resellerController', name: 'reseller_id'})
        reseller_id?: number

    @ApiProperty({type: 'enum', enum: InvoiceTemplateType, example: InvoiceTemplateType.SVG})
        type: InvoiceTemplateType

    @ApiProperty({type: 'enum', enum: InvoiceTemplateCallDirection, example: InvoiceTemplateCallDirection.In})
        callDirection: InvoiceTemplateCallDirection

    @ApiProperty({type: 'enum', enum: InvoiceTemplateCategory, example: InvoiceTemplateCategory.Customer})
        category: InvoiceTemplateCategory

    @ApiProperty()
        data: UrlReference

    constructor(entity: internal.InvoiceTemplate, options?: ResponseDtoOptions) {
        super(options)
        if (!entity) return

        this.id = entity.id
        this.name = entity.name
        this.reseller_id = entity.resellerId
        this.type = entity.type
        this.callDirection = entity.callDirection
        this.category = entity.category
        this.data = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/@data`,
        }
    }
}
