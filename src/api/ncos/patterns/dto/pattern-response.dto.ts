import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NCOSPatternResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the NCOS pattern'})
        id: number

    @ApiProperty({description: 'NCOS level of the pattern'})
        ncos_level_id: number

    @ApiProperty({description: 'PCRE regex matched against the called number'})
        pattern: string

    @ApiProperty({description: 'Description of the pattern'})
        description?: string | null

    constructor(entity: internal.NCOSPattern, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.ncos_level_id = entity.ncosLevelId
        this.pattern = entity.pattern
        this.description = entity.description
    }
}