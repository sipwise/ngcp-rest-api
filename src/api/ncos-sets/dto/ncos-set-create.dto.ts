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

    toInternal(): internal.NCOSSet {
        const entity = new internal.NCOSSet()
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description

        return entity
    }
}
