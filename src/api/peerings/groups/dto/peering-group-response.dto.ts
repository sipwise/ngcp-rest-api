import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringGroupResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'contract_id', controller: 'contractController'})
        contract_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @CanBeNull()
    @IsString()
    @ApiProperty()
        description?: string

    @IsInt()
    @ApiProperty()
        priority: number

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        time_set_id?: number

    constructor(entity: internal.VoipPeeringGroup, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.contract_id = entity.peeringContractId
        this.name = entity.name
        this.description = entity.description
        this.priority = entity.priority
        this.time_set_id = entity.timeSetId
    }
}