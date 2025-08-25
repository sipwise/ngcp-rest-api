import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class PeeringGroupRequestDto implements RequestDto {
    @ApiProperty({description: 'System Contract Id', example: 1})
    @IsPositive()
    @IsInt()
        contract_id!: number

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(127)
        name!: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
        description?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
        priority: number = 1

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
        time_set_id?: number

    constructor(entity?: internal.VoipPeeringGroup) {
        if (!entity)
            return
        this.name = entity.name
        this.description = entity.description
        this.priority = entity.priority
        this.time_set_id = entity.timeSetId
        this.contract_id = entity.peeringContractId
    }

    toInternal(options: RequestDtoOptions = {}): internal.VoipPeeringGroup {
        const entity = new internal.VoipPeeringGroup()
        entity.name = this.name
        entity.description = this.description
        entity.priority = this.priority
        entity.timeSetId = this.time_set_id
        entity.peeringContractId = this.contract_id

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
