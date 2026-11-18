import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSSetLevelSearchDto {
    @ApiPropertyOptional({description: 'NCOS set the level belongs to'})
        set_id: number
    @ApiPropertyOptional({description: 'NCOS level in the set'})
        level_id: number
    @ApiPropertyOptional({description: 'Id of the NCOS set level'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'ncosSetLevel.id',
            set_id: 'ncos_set_id',
            level_id: 'level_id',
        }
}
