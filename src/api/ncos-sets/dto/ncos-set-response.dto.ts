import {internal} from '../../../entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsOptional} from 'class-validator'

export interface NCOSSetLevelReference {
    type: string
    link: string
}

export class NCOSSetResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsOptional()
    @ApiPropertyOptional()
        reseller_id: number

    @IsNotEmpty()
    @ApiProperty()
        name: string

    @ApiProperty()
        description: string

    @IsNotEmpty()
    @ApiProperty()
        levels: NCOSSetLevelReference

    constructor(prefix: string, entity: internal.NCOSSet) {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.levels = {
            type: 'array',
            link: prefix + '/levels'
        }
    }
}