import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Transform} from 'class-transformer'
import {IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

export class InvoiceTemplateRequestDto implements RequestDto {
    @ApiPropertyOptional({
        description: 'SVG template file (`image/svg+xml`, multipart/form-data only). If omitted on create or update, the default template of the category is stored',
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
        file?: string

    @ApiProperty({example: 'Default customer invoice'})
    @IsString()
    @IsNotEmpty()
        name: string

    @ApiPropertyOptional({
        example: 1,
        nullable: true,
        description: 'Required for categories `customer` and `did`, must be empty for `peer` and `reseller`. Enforced to own reseller for reseller users',
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Transform(({value}: {value: unknown}): unknown => {
        if (value === undefined || value === null)
            return value
        if (value === '' || value === 'null')
            return null
        const parsed = Number(value)
        return isNaN(parsed) ? value : parsed
    })
        reseller_id?: number

    @ApiPropertyOptional({enum: [InvoiceTemplateType.SVG], default: InvoiceTemplateType.SVG})
    @IsOptional()
    @IsIn([InvoiceTemplateType.SVG])
        type?: InvoiceTemplateType

    @ApiPropertyOptional({enum: InvoiceTemplateCallDirection, default: InvoiceTemplateCallDirection.Out})
    @IsOptional()
    @IsEnum(InvoiceTemplateCallDirection)
        call_direction?: InvoiceTemplateCallDirection

    @ApiPropertyOptional({enum: InvoiceTemplateCategory, default: InvoiceTemplateCategory.Customer})
    @IsOptional()
    @IsEnum(InvoiceTemplateCategory)
        category?: InvoiceTemplateCategory

    constructor(entity?: internal.InvoiceTemplate) {
        if (!entity)
            return
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.type = entity.type
        this.call_direction = entity.callDirection
        this.category = entity.category
    }

    toInternal(options: RequestDtoOptions = {}): internal.InvoiceTemplate {
        const entity = new internal.InvoiceTemplate()
        entity.resellerId = this.reseller_id ?? null
        entity.name = this.name
        entity.type = this.type ?? InvoiceTemplateType.SVG
        entity.callDirection = this.call_direction ?? InvoiceTemplateCallDirection.Out
        entity.category = this.category ?? InvoiceTemplateCategory.Customer
        if (options.id)
            entity.id = options.id

        if (options.assignNulls) {
            Object.keys(entity).forEach(k => {
                if (entity[k] === undefined)
                    entity[k] = null
            })
        }
        return entity
    }
}
