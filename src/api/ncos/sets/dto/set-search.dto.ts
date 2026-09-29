import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSSetSearchDto {
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        expose_to_customer: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'ncosSet.id',
    }
}
