import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxGroupSearchDto {
    @ApiPropertyOptional()
        customer_id: number
    @ApiPropertyOptional()
        extension: string
    @ApiPropertyOptional()
        hunt_policy: string
    @ApiPropertyOptional()
        hunt_timeout: number
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'bg.id',
        }
}