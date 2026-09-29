import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxGroupSearchDto {
    @ApiPropertyOptional()
        customer_id: number = undefined
    @ApiPropertyOptional()
        extension: string = undefined
    @ApiPropertyOptional()
        hunt_policy: string = undefined
    @ApiPropertyOptional()
        hunt_timeout: number = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'bg.id',
    }
}