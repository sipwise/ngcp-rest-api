import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NCOSLevelResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the NCOS level'})
        id: number

    @ApiProperty({description: 'Reseller of the NCOS level'})
        reseller_id: number

    @ApiProperty({description: 'Name of the NCOS level'})
        level: string

    @ApiProperty({description: '`whitelist`: only matching numbers may be called, `blacklist`: matching numbers are blocked', type: NCOSLevelMode, enumName: 'NCOSLevelMode'})
        mode: NCOSLevelMode

    @ApiProperty({description: 'Calls to the local area code are also checked'})
        local_ac: boolean

    @ApiProperty({description: 'Calls within the same PBX customer are also checked'})
        intra_pbx: boolean

    @ApiProperty({description: 'Description of the NCOS level'})
        description?: string | null

    @ApiProperty({description: 'Time set the level applies in; null = always'})
        time_set_id?: number | null

    @ApiProperty({description: 'Customers can see and use the level in their preferences'})
        expose_to_customer: boolean

    @ApiProperty({description: 'Time set matching is inverted'})
        time_set_invert: boolean

    constructor(entity: internal.NCOSLevel, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.level = entity.level
        this.mode = entity.mode
        this.local_ac = entity.localAc
        this.intra_pbx = entity.intraPbx
        this.description = entity.description
        this.time_set_id = entity.timeSetId
        this.expose_to_customer = entity.exposeToCustomer
        this.time_set_invert = entity.timeSetInvert
    }
}