import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class NCOSPatternRequestDto implements RequestDto {
    @ApiProperty()
    @IsInt()
    @IsPositive()
        ncos_level_id: number

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
        pattern: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
        description?: string

    constructor(entity?: internal.NCOSPattern) {
        if (!entity)
            return
        this.ncos_level_id = entity.ncosLevelId
        this.pattern = entity.pattern
        this.description = entity.description
    }

    toInternal(options: RequestDtoOptions = {}): internal.NCOSPattern {
        const entity = new internal.NCOSPattern()
        entity.ncosLevelId = this.ncos_level_id
        entity.pattern = this.pattern
        entity.description = this.description
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
