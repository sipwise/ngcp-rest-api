import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

export class NCOSLevelSearchDto {
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        level: number = undefined
    @ApiPropertyOptional()
        mode: NCOSLevelMode = undefined
    @ApiPropertyOptional()
        local_ac: boolean = undefined
    @ApiPropertyOptional()
        intra_pbx: boolean = undefined
    @ApiPropertyOptional()
        description: string = undefined
    @ApiPropertyOptional()
        time_set_id: number = undefined
    @ApiPropertyOptional()
        time_set_invert: boolean = undefined
    @ApiPropertyOptional()
        expose_to_customer: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
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
