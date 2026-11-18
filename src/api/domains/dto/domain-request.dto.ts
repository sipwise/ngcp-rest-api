import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive} from 'class-validator'

import {RequestDto} from '~/dto/request.dto'
import {internal} from '~/entities'

export class DomainRequestDto implements RequestDto {
    @IsNotEmpty()
    @ApiProperty({description: 'Fully qualified domain name', example: 'sip.example.org'})
        domain: string

    @ApiPropertyOptional({
        description: 'Reseller of the domain; required for admin roles, the own reseller for reseller roles',
        type: 'integer',
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    constructor(entity?: internal.Domain) {
        if (!entity)
            return

        // TODO rework as the Dto key names are not always equal to the Entity ones
        Object.keys(entity).map(key => {
            this[key] = entity[key]
        })
    }

    toInternal(): internal.Domain {
        const domain = new internal.Domain()
        domain.domain = this.domain
        domain.reseller_id = this.reseller_id
        return domain
    }
}
