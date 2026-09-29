import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NumberSearchDto {
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiPropertyOptional()
        is_primary: boolean = undefined
    @ApiPropertyOptional()
        is_devid: boolean = undefined
    @ApiPropertyOptional()
        number_id: number = undefined
    @ApiPropertyOptional()
        cc: number = undefined
    @ApiPropertyOptional()
        ac: string = undefined
    @ApiPropertyOptional()
        sn: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'voipNumber.id',
    }
}