import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationSetSearchDto {
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'headerRuleSet.id',
        }
}
