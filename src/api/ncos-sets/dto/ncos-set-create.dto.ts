import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsOptional} from 'class-validator'
import {internal} from '../../../entities'

export class NCOSSetCreateDto {
    @IsOptional()
    @ApiPropertyOptional({description: 'Reseller Id', example: 1})
        reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'NCOS set name', example: "Restricted destinations"})
        name: string

    @IsNotEmpty()
    @ApiProperty({description: 'NCOS set description', example: 'For all subscribers'})
        description: string

    @IsOptional()
    @ApiPropertyOptional({description: 'NCOS set expose to customer', example: 'true'})
        expose_to_customer?: boolean

    toInternal(): internal.NCOSSet {
        const entity = new internal.NCOSSet()
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description
        entity.exposeToCustomer = this.expose_to_customer

        return entity
    }
}
