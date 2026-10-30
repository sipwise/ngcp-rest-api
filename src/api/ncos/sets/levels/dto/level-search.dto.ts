import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSSetLevelSearchDto {
    @ApiPropertyOptional()
        set_id: number
    @ApiPropertyOptional()
        level_id: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'ncosSetLevel.id',
            set_id: 'ncos_set_id',
            level_id: 'level_id',
        }
}
