import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

export class NCOSLevelSearchDto {
    @ApiPropertyOptional({description: 'Reseller of the NCOS level'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Name of the NCOS level'})
        level: number
    @ApiPropertyOptional({description: '`whitelist`: only matching numbers may be called, `blacklist`: matching numbers are blocked'})
        mode: NCOSLevelMode
    @ApiPropertyOptional({description: 'Calls to the local area code are also checked'})
        local_ac: boolean
    @ApiPropertyOptional({description: 'Calls within the same PBX customer are also checked'})
        intra_pbx: boolean
    @ApiPropertyOptional({description: 'Description of the NCOS level'})
        description: string
    @ApiPropertyOptional({description: 'Time set the level applies in; null = always'})
        time_set_id: number
    @ApiPropertyOptional({description: 'Time set matching is inverted'})
        time_set_invert: boolean
    @ApiPropertyOptional({description: 'Customers can see and use the level in their preferences'})
        expose_to_customer: boolean
    @ApiPropertyOptional({description: 'Id of the NCOS level'})
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
