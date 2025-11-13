import {ApiProperty} from '@nestjs/swagger'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NCOSLevelResponseDto extends ResponseDto {
    @ApiProperty()
        id: number

    @Expandable({name: 'reseller_id', controller: 'resellerController'})
    @ApiProperty()
        reseller_id: number

    @ApiProperty()
        level: string

    @ApiProperty({type: NCOSLevelMode, enum: NCOSLevelMode})
        mode: NCOSLevelMode

    @ApiProperty()
        local_ac: boolean

    @ApiProperty()
        intra_pbx: boolean

    @ApiProperty()
        description?: string | null

    @ApiProperty()
        time_set_id?: number | null

    @ApiProperty()
        expose_to_customer: boolean

    @ApiProperty()
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