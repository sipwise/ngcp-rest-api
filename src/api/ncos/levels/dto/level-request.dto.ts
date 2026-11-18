import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

export class NCOSLevelRequestDto implements RequestDto {
    @ApiPropertyOptional({
        description: 'Reseller of the NCOS level; required for admin roles, the own reseller for reseller roles',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    @ApiProperty({description: 'Name of the NCOS level'})
    @IsString()
    @IsNotEmpty()
        level: string

    @ApiProperty({description: '`whitelist`: only matching numbers may be called, `blacklist`: matching numbers are blocked'})
    @IsEnum(NCOSLevelMode)
        mode: NCOSLevelMode

    @ApiProperty({description: 'Calls to the local area code are also checked'})
    @IsBoolean()
        local_ac: boolean

    @ApiProperty({description: 'Calls within the same PBX customer are also checked'})
    @IsBoolean()
        intra_pbx: boolean

    @ApiProperty({description: 'Time set matching is inverted'})
    @IsBoolean()
        time_set_invert: boolean

    @ApiPropertyOptional({description: 'Description of the NCOS level'})
    @IsOptional()
    @IsString()
        description?: string

    @ApiPropertyOptional({description: 'Time set the level applies in; null = always'})
    @IsOptional()
    @IsInt()
    @IsPositive()
        time_set_id?: number

    @ApiPropertyOptional({description: 'Customers can see and use the level in their preferences'})
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
        this.time_set_invert = entity.timeSetInvert
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
        entity.timeSetInvert = this.time_set_invert
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
