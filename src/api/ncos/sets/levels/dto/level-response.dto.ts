import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NCOSSetLevelResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the NCOS set level'})
        id: number

    @IsInt()
    @ApiProperty({description: 'NCOS set the level belongs to'})
        set_id: number

    @IsInt()
    @ApiProperty({description: 'NCOS level in the set'})
        level_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the NCOS level'})
        level: string

    constructor(entity: internal.NCOSSetLevel, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.level_id = entity.ncosLevelId
        this.set_id = entity.ncosSetId
        this.level = entity.level
    }
}
