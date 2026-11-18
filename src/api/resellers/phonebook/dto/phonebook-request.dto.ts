import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class ResellerPhonebookRequestDto implements RequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({description: 'Phone number or SIP URI'})
        number: string

    @ApiPropertyOptional({
        description: 'Reseller owning the entry; required for admin roles, the own reseller for reseller roles',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    constructor(entity?: internal.ResellerPhonebook) {
        if (!entity)
            return

        this.name = entity.name
        this.number = entity.number
        this.reseller_id = entity.resellerId
    }

    toInternal(options: RequestDtoOptions = {}): internal.ResellerPhonebook {
        const entity = new internal.ResellerPhonebook()
        entity.name = this.name
        entity.resellerId = this.reseller_id
        entity.number = this.number
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
