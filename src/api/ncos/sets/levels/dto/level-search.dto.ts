import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSSetLevelSearchDto {
    @ApiPropertyOptional()
        set_id: number = undefined
    @ApiPropertyOptional()
        level_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'ncosSetLevel.id',
        set_id: 'ncos_set_id',
        level_id: 'level_id',
    }
}
