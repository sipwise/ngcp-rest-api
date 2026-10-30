import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSSetSearchDto {
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        expose_to_customer: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'ncosSet.id',
        }
}
