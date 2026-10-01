import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsEnum, IsInt, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class InvoiceTemplateResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @CanBeNull()
    @IsInt()
    @ApiProperty({nullable: true})
    @Expandable({controller: 'resellerController', name: 'reseller_id'})
        reseller_id: number | null

    @IsString()
    @ApiProperty()
        name: string

    @IsEnum(InvoiceTemplateType)
    @ApiProperty({enum: InvoiceTemplateType, example: InvoiceTemplateType.SVG})
        type: InvoiceTemplateType

    @IsEnum(InvoiceTemplateCallDirection)
    @ApiProperty({enum: InvoiceTemplateCallDirection, example: InvoiceTemplateCallDirection.Out})
        call_direction: InvoiceTemplateCallDirection

    @IsEnum(InvoiceTemplateCategory)
    @ApiProperty({enum: InvoiceTemplateCategory, example: InvoiceTemplateCategory.Customer})
        category: InvoiceTemplateCategory

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the variables and functions supported by the category of the template (`GET .../:id/@vars`)'})
        vars: UrlReference

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the pdf preview of the template rendered with example values (`GET .../:id/@preview`)'})
        preview: UrlReference

    constructor(entity: internal.InvoiceTemplate, options?: ResponseDtoOptions) {
        super(options)
        if (!entity) return

        this.id = entity.id
        this.reseller_id = entity.resellerId ?? null
        this.name = entity.name
        this.type = entity.type
        this.call_direction = entity.callDirection
        this.category = entity.category
        this.vars = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/@vars`,
        }
        this.preview = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/@preview`,
        }
    }
}
