import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NCOSSetLevelResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        set_id: number

    @IsInt()
    @ApiProperty()
        level_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        level: string

    constructor(entity: internal.NCOSSetLevel, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.level_id = entity.ncosLevelId
        this.set_id = entity.ncosSetId
        this.level = entity.level
    }
}