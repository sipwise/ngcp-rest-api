import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Transform} from 'class-transformer'
import {IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class ResellerPhonebookCsvRequestDto implements RequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty()
        number: string

    @ApiPropertyOptional({
        description: 'Reseller Id, mandatory for admin and system roles, must be empty for reseller roles' +
            ' as it is automatically set to the reseller_id of the user',
        example: 1,
    })
    @IsOptional()
    @IsNumberString()
    @Transform(({value}: {value: unknown}): unknown => value === '' ? undefined : value)
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
