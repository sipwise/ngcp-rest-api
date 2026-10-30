import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

export class NCOSLevelSearchDto {
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        level: number
    @ApiPropertyOptional()
        mode: NCOSLevelMode
    @ApiPropertyOptional()
        local_ac: boolean
    @ApiPropertyOptional()
        intra_pbx: boolean
    @ApiPropertyOptional()
        description: string
    @ApiPropertyOptional()
        time_set_id: number
    @ApiPropertyOptional()
        time_set_invert: boolean
    @ApiPropertyOptional()
        expose_to_customer: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'ncosLevel.id',
            reseller_id: 'ncosLevel.reseller_id',
            level: 'ncosLevel.level',
            mode: 'ncosLevel.mode',
            local_ac: 'ncosLevel.local_ac',
            intra_pbx: 'ncosLevel.intra_pbx',
            description: 'ncosLevel.description',
            time_set_id: 'ncosLevel.time_set_id',
            expose_to_customer: 'ncosLevel.expose_to_customer',
        }
}
