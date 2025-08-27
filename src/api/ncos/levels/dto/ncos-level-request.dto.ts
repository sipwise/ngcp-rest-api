import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

export class NCOSLevelRequestDto implements RequestDto {
    @ApiProperty()
    @IsInt()
    @IsPositive()
        reseller_id: number

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
        level: string

    @ApiProperty()
    @IsEnum(NCOSLevelMode)
        mode: NCOSLevelMode

    @ApiProperty()
    @IsBoolean()
        local_ac: boolean

    @ApiProperty()
    @IsBoolean()
        intra_pbx: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
        description?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
        time_set_id?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
        expose_to_customer?: boolean

    constructor(entity?: internal.NCOSLevel) {
        if (!entity)
            return
        this.reseller_id = entity.resellerId
        this.level = entity.level
        this.mode = entity.mode
        this.local_ac = entity.localAc
        this.intra_pbx = entity.intraPbx
        this.description = entity.description
        this.time_set_id = entity.timeSetId
        this.expose_to_customer = entity.exposeToCustomer
    }

    toInternal(options: RequestDtoOptions = {}): internal.NCOSLevel {
        const entity = new internal.NCOSLevel()
        entity.resellerId = this.reseller_id
        entity.level = this.level
        entity.mode = this.mode
        entity.localAc = this.local_ac
        entity.intraPbx = this.intra_pbx
        entity.description = this.description
        entity.timeSetId = this.time_set_id
        entity.exposeToCustomer = this.expose_to_customer
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
