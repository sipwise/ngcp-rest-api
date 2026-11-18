import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxGroupSearchDto {
    @ApiPropertyOptional({description: 'PBX customer of the group'})
        customer_id: number
    @ApiPropertyOptional({description: 'Extension of the group'})
        extension: string
    @ApiPropertyOptional({description: 'Hunting policy of the group'})
        hunt_policy: string
    @ApiPropertyOptional({description: 'Hunting timeout in seconds'})
        hunt_timeout: number
    @ApiPropertyOptional({description: 'Display name of the group'})
        name: string
    @ApiPropertyOptional({description: 'Id of the PBX group'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'bg.id',
        }
}