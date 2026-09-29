import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationSetSearchDto {
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'headerRuleSet.id',
    }
}
