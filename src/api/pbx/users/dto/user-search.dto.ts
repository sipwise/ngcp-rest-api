import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxUserSearchDto {
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        display_name: string
    @ApiPropertyOptional()
        pbx_extension: string
    @ApiHideProperty()
        _alias = {
            id: 'bSubscriber.id',
        }
}