import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringGroupSearchDto {
    @ApiPropertyOptional({description: 'System contract of the peering group'})
        contract_id: number
    @ApiPropertyOptional({description: 'Name of the peering group'})
        name: string
    @ApiPropertyOptional({description: 'Description of the peering group'})
        description: number
    @ApiPropertyOptional({description: 'Time set restricting the periods the group is active in; null = always active'})
        time_set_id: number
    @ApiPropertyOptional({description: 'Priority of the group, 1 (highest) to 9 (lowest); 1 if omitted'})
        priority: number
    @ApiPropertyOptional({description: 'Id of the peering group'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'vpg.id',
            contract_id: 'vpg.peering_contract_id',
        }
}
