import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class NCOSSetLevelResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsNotEmpty()
    @ApiProperty()
        set_id: number

    @IsNotEmpty()
    @ApiProperty()
        level_id: number

    @IsNotEmpty()
    @ApiProperty()
        level: string

    constructor(entity: internal.NCOSSetLevel) {
        this.id = entity.id
        this.level_id = entity.ncosLevelId
        this.set_id = entity.ncosSetId
        this.level = entity.level
    }
}