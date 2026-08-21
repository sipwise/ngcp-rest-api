import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NCOSPatternResponseDto extends ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
        ncos_level_id: number

    @ApiProperty()
        pattern: string

    @ApiProperty()
        description?: string | null

    constructor(entity: internal.NCOSPattern, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.ncos_level_id = entity.ncosLevelId
        this.pattern = entity.pattern
        this.description = entity.description
    }
}