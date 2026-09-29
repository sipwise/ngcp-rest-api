import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringGroupSearchDto {
    @ApiPropertyOptional()
        contract_id: number = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        description: number = undefined
    @ApiPropertyOptional()
        time_set_id: number = undefined
    @ApiPropertyOptional()
        priority: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'vpg.id',
        contract_id: 'vpg.peering_contract_id',
    }
}
