import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class NCOSSetLevelRequestDto implements RequestDto {
    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: 'NCOS Level Id', example: 2})
        level_id: number

    toInternal(options: RequestDtoOptions = {}): internal.NCOSSetLevel {
        const entity = new internal.NCOSSetLevel()
        entity.ncosLevelId = this.level_id
        entity.ncosSetId = options.parentId

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
