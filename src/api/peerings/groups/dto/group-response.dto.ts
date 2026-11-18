import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PeeringGroupResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the peering group'})
        id: number

    @IsInt()
    @ApiProperty({description: 'System contract of the peering group'})
        contract_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the peering group'})
        name: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Description of the peering group'})
        description?: string

    @IsInt()
    @ApiProperty({description: 'Priority of the group, 1 (highest) to 9 (lowest); 1 if omitted'})
        priority: number

    @IsBoolean()
    @ApiProperty({description: 'Group has at least one inbound rule; set by the server'})
        has_inbound_rules: boolean

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Time set restricting the periods the group is active in; null = always active'})
        time_set_id?: number

    constructor(entity: internal.VoipPeeringGroup, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.contract_id = entity.peeringContractId
        this.name = entity.name
        this.description = entity.description
        this.priority = entity.priority
        this.has_inbound_rules = entity.hasInboundRules
        this.time_set_id = entity.timeSetId
    }
}