import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationSetSearchDto {
    @ApiPropertyOptional({description: 'Reseller of the header rule set'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Subscriber the set belongs to; null = reseller-wide set'})
        subscriber_id: number
    @ApiPropertyOptional({description: 'Name of the header rule set'})
        name: string
    @ApiPropertyOptional({description: 'Id of the header rule set'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'headerRuleSet.id',
        }
}
