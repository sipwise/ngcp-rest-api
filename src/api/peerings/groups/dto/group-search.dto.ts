import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringGroupSearchDto {
    @ApiPropertyOptional()
        contract_id: number
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        description: number
    @ApiPropertyOptional()
        time_set_id: number
    @ApiPropertyOptional()
        priority: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'vpg.id',
            contract_id: 'vpg.peering_contract_id',
        }
}
