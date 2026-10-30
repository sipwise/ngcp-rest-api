import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NumberSearchDto {
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiPropertyOptional()
        is_primary: boolean
    @ApiPropertyOptional()
        is_devid: boolean
    @ApiPropertyOptional()
        number_id: number
    @ApiPropertyOptional()
        cc: number
    @ApiPropertyOptional()
        ac: string
    @ApiPropertyOptional()
        sn: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'voipNumber.id',
        }
}