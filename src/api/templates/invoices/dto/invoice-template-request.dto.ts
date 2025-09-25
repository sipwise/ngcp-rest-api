import {ApiProperty} from '@nestjs/swagger'
import {Transform} from 'class-transformer'
import {IsEnum, IsInt, IsNotEmpty, IsPositive, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

export class InvoiceTemplateRequestDto implements RequestDto {
    @ApiProperty({
        description: 'File to upload',
        type: 'string',
        format: 'binary',
    })
        file: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
        name: string

    @ApiProperty()
    @IsInt()
    @IsPositive()
    @Transform(({value}) => {
        const parsed = parseInt(value)
        if (isNaN(parsed) || parsed < 0)
            return 0
        return parsed
    })
        reseller_id?: number

    @ApiProperty()
    @IsEnum(InvoiceTemplateType)
        type: InvoiceTemplateType

    @ApiProperty()
    @IsEnum(InvoiceTemplateCallDirection)
        call_direction: InvoiceTemplateCallDirection

    @ApiProperty()
    @IsEnum(InvoiceTemplateCategory)
        category: InvoiceTemplateCategory

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
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.type = this.type
        entity.callDirection = this.call_direction
        entity.category = this.category
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
