import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumberString, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class CustomerPhonebookCsvRequestDto implements RequestDto {
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

    @IsNumberString()
    @ApiProperty()
        customer_id: number

    constructor(entity?: internal.CustomerPhonebook) {
        if (!entity)
            return

        this.name = entity.name
        this.number = entity.number
        this.customer_id = entity.contractId
    }

    toInternal(options: RequestDtoOptions = {}): internal.CustomerPhonebook {
        const entity = new internal.CustomerPhonebook()
        entity.name = this.name
        entity.contractId = this.customer_id
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
