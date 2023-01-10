import {internal} from '../../../entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsArray, IsNotEmpty, IsOptional, ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class NCOSSetUpdateDto {
    @IsOptional()
    @ApiPropertyOptional({description: 'Reseller Id', example: 1})
        reseller_id?: number

    @IsNotEmpty()
    @ApiPropertyOptional({description: 'NCOS set name', example: "Restricted destinations"})
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
