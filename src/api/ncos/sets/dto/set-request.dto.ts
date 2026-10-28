import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class NCOSSetRequestDto implements RequestDto {
    @ApiPropertyOptional({
        description: 'Reseller Id, mandatory for admin and system roles, must not be provided by reseller roles' +
            ' as it is automatically set to the reseller_id of the user',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'NCOS set name', example: 'Restricted destinations'})
        name: string

    @IsNotEmpty()
    @ApiProperty({description: 'NCOS set description', example: 'For all subscribers'})
        description: string

    @IsOptional()
    @ApiPropertyOptional({description: 'NCOS set expose to customer', example: 'true'})
        expose_to_customer?: boolean

    constructor(entity?: internal.NCOSSet) {
        if (!entity)
            return
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.expose_to_customer = entity.exposeToCustomer
    }

    toInternal(options: RequestDtoOptions = {}): internal.NCOSSet {
        const entity = new internal.NCOSSet()
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description
        entity.exposeToCustomer = this.expose_to_customer
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
