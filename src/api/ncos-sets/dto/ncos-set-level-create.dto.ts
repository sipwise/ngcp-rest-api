import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {internal} from '../../../entities'

export class NCOSSetLevelCreateDto {
    @IsNotEmpty()
    @ApiProperty({description: 'NCOS Level Id', example: 2})
        level_id: number

    toInternal(): internal.NCOSSetLevel {
        const entity = new internal.NCOSSetLevel()
        entity.ncosLevelId = this.level_id

        return entity
    }
}
