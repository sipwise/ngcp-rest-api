import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber} from 'class-validator'

import {RequestDto} from '~/dto/request.dto'
import {internal} from '~/entities'

export class NCOSSetLevelRequestDto implements RequestDto {
    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: 'NCOS Level Id', example: 2})
        level_id: number

    toInternal(): internal.NCOSSetLevel {
        const entity = new internal.NCOSSetLevel()
        entity.ncosLevelId = this.level_id

        return entity
    }
}
