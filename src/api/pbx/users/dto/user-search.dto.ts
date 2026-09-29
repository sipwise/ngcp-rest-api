import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxUserSearchDto {
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        display_name: string = undefined
    @ApiPropertyOptional()
        pbx_extension: string = undefined
    @ApiHideProperty()
    _alias = {
        id: 'bSubscriber.id',
    }
}